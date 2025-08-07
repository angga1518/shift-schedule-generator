"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Copy, ExternalLink, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

import { ConfigSection } from "@/components/schedule/config-section"
import { PersonnelSection } from "@/components/schedule/personnel-section"
import { ResultsSection } from "@/components/schedule/results-section"
import { RulesReference } from "@/components/schedule/rules-reference"

import { getDefaultMonth, useConfig } from "@/hooks/use-config"
import { usePersonnel } from "@/hooks/use-personnel"
import { dummyConfig, dummyPersonnel, hardDummyPersonnel } from "@/utils/dummy-data"

import { ScheduleGenerator } from "@/utils/schedule-generator"
import { ApiScheduleGenerator } from "@/utils/api-schedule-generator"
import { ExcelExporter } from "@/utils/excel-exporter"
import { ScheduleValidator } from "@/utils/validator"
import { calculateStats } from "@/utils/statistics"
import { generateAIPrompt } from "@/utils/prompt-generator"
import { ScheduleUtils } from "@/utils/schedule-utils"
import { getDaysInMonth, format } from "date-fns"

import type { Schedule, Config, Personnel } from "@/types"

export default function ShiftScheduleGenerator() {
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  
  const { config, setConfig, specialDateForm, setSpecialDateForm, addSpecialDate, removeSpecialDate } = useConfig()
  const { personnel, setPersonnel, addPersonnel, removePersonnel, updatePersonnel } = usePersonnel()

  const [schedule, setSchedule] = useState<Schedule>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [violations, setViolations] = useState<Array<{ type: string, message: string, person?: string, day?: number }>>([])
  const [currentAttempt, setCurrentAttempt] = useState<number>(0)
  
  // AI Assistant modal states
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState<string>("")
  const [aiJsonInput, setAiJsonInput] = useState<string>("")
  const [aiImportError, setAiImportError] = useState<string>("")

  // Ensure component is mounted on client before rendering interactive content
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleGenerateSchedule = async () => {
    setIsGenerating(true)
    setError("")
    setSuccess(false)
    setSchedule({})
    setViolations([])
    setCurrentAttempt(0)

    // Use a timeout to allow the UI to update to "Generating..."
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const generator = new ScheduleGenerator(config, personnel, (attempt, maxAttempts, violations) => {
        setCurrentAttempt(attempt)
      })
      const generatedSchedule = await generator.generateSchedule()
      
      // Check if schedule has violations
      const scheduleViolations = (generatedSchedule as any)._violations || []
      
      setSchedule(generatedSchedule)
      setViolations(scheduleViolations)
      setSuccess(true)
      
      if (scheduleViolations.length === 0) {
        console.log("Perfect schedule generated!")
      } else {
        console.log(`Schedule generated with ${scheduleViolations.length} violations`)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule")
      setSchedule({}) // Clear schedule on error
      setViolations([])
    } finally {
      setIsGenerating(false)
      setCurrentAttempt(0)
    }
  }

  const handleGenerateScheduleAPI = async () => {
    setIsGenerating(true)
    setError("")
    setSuccess(false)
    setSchedule({})
    setViolations([])
    setCurrentAttempt(0)

    // Use a timeout to allow the UI to update to "Generating..."
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const apiGenerator = new ApiScheduleGenerator(config, personnel)
      const generatedSchedule = await apiGenerator.generateSchedule()
      
      setSchedule(generatedSchedule)
      setViolations([]) // API doesn't return violations in the same format
      setSuccess(true)
      
      console.log("Schedule generated via API successfully!")
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule via API")
      setSchedule({}) // Clear schedule on error
      setViolations([])
    } finally {
      setIsGenerating(false)
      setCurrentAttempt(0)
    }
  }

  const handleExportToExcel = () => {
    try {
      const exporter = new ExcelExporter(schedule, personnel, config)
      exporter.exportToExcel()
      
      toast({
        title: "Success!",
        description: "Schedule exported to Excel successfully.",
      })
    } catch (err) {
      console.error('Failed to export to Excel:', err)
      toast({
        title: "Export failed",
        description: "Failed to export schedule to Excel.",
        variant: "destructive",
      })
    }
  }

  const populateWithDummyData = () => {
    setConfig(dummyConfig)
    setPersonnel(dummyPersonnel)
    setSchedule({})
    setError("")
    setSuccess(false)
    setViolations([])
    setCurrentAttempt(0)
  }

  const populateWithHardDummyData = () => {
    setConfig(dummyConfig)
    setPersonnel(hardDummyPersonnel)
    setSchedule({})
    setError("")
    setSuccess(false)
    setViolations([])
    setCurrentAttempt(0)
  }

  const handleAIAssistant = () => {
    // Generate prompt and open modal
    const prompt = generateAIPrompt(config, personnel)
    setAiPrompt(prompt)
    setAiJsonInput("")
    setAiImportError("")
    setIsAIModalOpen(true)
  }

  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt)
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard successfully.",
      })
    } catch (err) {
      console.error('Failed to copy prompt:', err)
      toast({
        title: "Copy failed",
        description: "Failed to copy prompt to clipboard.",
        variant: "destructive",
      })
    }
  }

  const handleImportSchedule = () => {
    setAiImportError("")
    
    try {
      const importedSchedule = JSON.parse(aiJsonInput)
      
      // Detailed validation
      const validationResult = validateImportedSchedule(importedSchedule, config, personnel)
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join('\n'))
      }
      
      // If validation passes, set the schedule
      setSchedule(importedSchedule)
      setViolations(validationResult.violations || [])
      setSuccess(true)
      setIsAIModalOpen(false)
      
      if (validationResult.violations && validationResult.violations.length > 0) {
        console.log(`AI Schedule imported with ${validationResult.violations.length} violations`)
      } else {
        console.log("Perfect AI schedule imported!")
      }
      
    } catch (err) {
      setAiImportError(err instanceof Error ? err.message : "Failed to parse JSON")
    }
  }

  const validateImportedSchedule = (schedule: any, config: Config, personnel: Personnel[]) => {
    const errors: string[] = []
    
    // Basic structure validation
    if (!schedule || typeof schedule !== 'object') {
      return { isValid: false, errors: ["Invalid JSON format - expected object"] }
    }
    
    const [year, month] = config.month.split("-").map(Number)
    const daysInMonth = getDaysInMonth(new Date(year, month - 1))
    
    // Validate all dates are present
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = format(new Date(year, month - 1, day), "yyyy-MM-dd")
      if (!schedule[dateString]) {
        errors.push(`Missing date: ${dateString}`)
      }
    }
    
    // Validate each day's structure and assignments
    for (const dateString in schedule) {
      const daySchedule = schedule[dateString]
      
      if (!daySchedule || typeof daySchedule !== 'object') {
        errors.push(`Invalid structure for ${dateString}`)
        continue
      }
      
      // Check required shift types exist
      if (!daySchedule.P || !daySchedule.S || !daySchedule.M) {
        errors.push(`Missing shift types (P/S/M) for ${dateString}`)
        continue
      }
      
      // Validate arrays
      if (!Array.isArray(daySchedule.P) || !Array.isArray(daySchedule.S) || !Array.isArray(daySchedule.M)) {
        errors.push(`Shift assignments must be arrays for ${dateString}`)
        continue
      }
      
      // Validate personnel IDs
      const allAssignments = [...daySchedule.P, ...daySchedule.S, ...daySchedule.M]
      
      // Check for double assignments
      const uniqueAssignments = new Set(allAssignments)
      if (uniqueAssignments.size !== allAssignments.length) {
        errors.push(`Double shift assignment detected on ${dateString}`)
      }
    }
    
    // If there are structural errors, return early
    if (errors.length > 0) {
      return { isValid: false, errors }
    }
    
    // Convert schedule format for internal validation
    const internalSchedule = convertScheduleToInternalFormat(schedule, personnel, year, month - 1, daysInMonth)
    
    // Use existing ScheduleValidator for comprehensive business rule validation
    const validator = new ScheduleValidator(config, personnel, internalSchedule, year, month - 1, daysInMonth)
    const violations = validator.validateFinalSchedule()
    
    return { 
      isValid: true, 
      errors: [], 
      violations: violations.length > 0 ? violations : undefined 
    }
  }

  // Helper function to convert Schedule format to internal format used by ScheduleValidator
  const convertScheduleToInternalFormat = (schedule: Schedule, personnel: Personnel[], year: number, month: number, daysInMonth: number) => {
    type ShiftType = "P" | "S" | "M"
    type LeaveType = "L" | "LT" | "CT"
    type ScheduleSlot = ShiftType | LeaveType
    
    const internalSchedule: Record<string, Record<number, ScheduleSlot>> = {}
    
    // First pass: assign all shifts
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = format(new Date(year, month, day), "yyyy-MM-dd")
      internalSchedule[dateString] = {}
      
      const daySchedule = schedule[dateString]
      if (daySchedule) {
        // Assign shifts (only assign if person has a shift)
        if (daySchedule.P) {
          for (const personId of daySchedule.P) {
            internalSchedule[dateString][personId] = "P"
          }
        }
        if (daySchedule.S) {
          for (const personId of daySchedule.S) {
            internalSchedule[dateString][personId] = "S"
          }
        }
        if (daySchedule.M) {
          for (const personId of daySchedule.M) {
            internalSchedule[dateString][personId] = "M"
          }
        }
      }
    }
    
    // Second pass: apply mandatory leaves for people not assigned after night shifts
    const shiftPersonnel = personnel.filter(p => p.role === 'shift')
    
    for (const person of shiftPersonnel) {
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = format(new Date(year, month, day), "yyyy-MM-dd")
        const currentShift = internalSchedule[currentDate]?.[person.id]
        
        if (currentShift === "M") {
          // Check if this is end of night sequence
          let isEndOfSequence = false
          if (day + 1 > daysInMonth) {
            isEndOfSequence = true
          } else {
            const nextDate = format(new Date(year, month, day + 1), "yyyy-MM-dd")
            const nextShift = internalSchedule[nextDate]?.[person.id]
            isEndOfSequence = !nextShift || nextShift !== "M"
          }
          
          if (isEndOfSequence) {
            // Count consecutive nights ending at this day
            let consecutiveNights = 1
            for (let i = 1; i <= 2; i++) {
              if (day - i < 1) break
              const prevDate = format(new Date(year, month, day - i), "yyyy-MM-dd")
              const prevShift = internalSchedule[prevDate]?.[person.id]
              if (prevShift === "M") {
                consecutiveNights++
              } else {
                break
              }
            }
            
            // Apply mandatory leave days
            const leaveDaysNeeded = consecutiveNights >= 2 ? 2 : 1
            
            for (let leaveDay = 1; leaveDay <= leaveDaysNeeded; leaveDay++) {
              if (day + leaveDay > daysInMonth) break
              
              const leaveDate = format(new Date(year, month, day + leaveDay), "yyyy-MM-dd")
              const existingSlot = internalSchedule[leaveDate]?.[person.id]
              
              // If person is not assigned to any shift, mark as mandatory leave
              if (!existingSlot) {
                internalSchedule[leaveDate][person.id] = "L"
              }
              // If person has existing requested leaves (LT, CT), keep them
              // If person is assigned to a shift, it will be caught as a violation
            }
          }
        }
      }
    }
    
    return internalSchedule
  }

  // Remove the old placeholder function
  // const generateAIPrompt = (config: any, personnel: any): string => {
  //   return "Prompt generation will be implemented in Phase 2..."
  // }

  const resetForm = () => {
    setConfig({
      month: getDefaultMonth(),
      publicHolidays: [],
      specialDates: [],
      maxNightShifts: 9,
      maxDefaultLeaves: 10,
    })
    
    // Reset personnel to empty
    setPersonnel([])
    
    // Clear results and status
    setSchedule({})
    setError("")
    setSuccess(false)
    setViolations([])
    setCurrentAttempt(0)
  }

  const stats = useMemo(() => calculateStats(personnel, schedule), [personnel, schedule])

  // Show loading state during hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-gray-900">Laras Shift Schedule Generator</h1>
            <p className="text-gray-600">Automated monthly shift scheduling with complex rule validation</p>
            <div className="space-x-4">
              <Button variant="outline" disabled>
                Try with Easy Data
              </Button>
              <Button variant="outline" disabled>
                Try with Hard Data (Sept 2025)
              </Button>
              <Button variant="outline" disabled>
                Reset Form
              </Button>
            </div>
          </div>
          
          <div className="text-center py-8">
            <div className="animate-pulse text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Laras Shift Schedule Generator</h1>
          <p className="text-gray-600">Automated monthly shift scheduling with complex rule validation</p>
          <div className="space-x-4">
            <Button variant="outline" onClick={populateWithDummyData}>
              Try with Easy Data
            </Button>
            <Button variant="outline" onClick={populateWithHardDummyData}>
              Try with Hard Data (Sept 2025)
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset Form
            </Button>
          </div>
        </div>

        {/* Configuration Section */}
        <ConfigSection
          config={config}
          setConfig={setConfig}
          specialDateForm={specialDateForm}
          setSpecialDateForm={setSpecialDateForm}
          onAddSpecialDate={addSpecialDate}
          onRemoveSpecialDate={removeSpecialDate}
        />

        {/* Personnel Management */}
        <PersonnelSection
          personnel={personnel}
          onAddPersonnel={addPersonnel}
          onRemovePersonnel={removePersonnel}
          onUpdatePersonnel={updatePersonnel}
        />

        {/* Generate Button */}
        <div className="text-center py-4 space-y-4">
          <div className="space-x-4">
            <Button 
              onClick={handleGenerateScheduleAPI} 
              disabled={isGenerating} 
              size="lg" 
              className="px-12 py-3"
            >
              {isGenerating 
                ? "Generating..."
                : "Generate"
              }
            </Button>
            
            <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={handleAIAssistant}
                  variant="outline" 
                  size="lg" 
                  className="px-12 py-3"
                >
                  Generate with AI Assistant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>AI Assistant Schedule Generation</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  {/* Step 1: Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Step 1: Copy this prompt to AI</h3>
                      <Button onClick={copyPromptToClipboard} variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Prompt
                      </Button>
                    </div>
                    <div className="bg-gray-100 rounded-lg border">
                      <pre className="p-4 text-xs leading-relaxed overflow-auto max-h-80 whitespace-pre-wrap">
                        <code>{aiPrompt}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Step 2: AI Links */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Step 2: Open AI Chat</h3>
                    <div className="space-x-4">
                      <Button asChild variant="outline">
                        <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Gemini
                        </a>
                      </Button>
                      <Button asChild variant="outline">
                        <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          ChatGPT
                        </a>
                      </Button>
                      <Button asChild variant="outline">
                        <a href="https://claude.ai" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Claude
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Step 3: Import JSON */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Step 3: Paste AI's JSON response</h3>
                    <Textarea
                      value={aiJsonInput}
                      onChange={(e) => setAiJsonInput(e.target.value)}
                      placeholder="Paste the JSON schedule response from AI here..."
                      className="min-h-32"
                    />
                    {aiImportError && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{aiImportError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="mt-4">
                      <Button 
                        onClick={handleImportSchedule}
                        disabled={!aiJsonInput.trim()}
                        className="w-full"
                      >
                        Import and Display Schedule
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && violations.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Perfect schedule generated with no violations!
            </AlertDescription>
          </Alert>
        )}

        {success && violations.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Schedule generated with {violations.length} violation(s). You can retry to get a better result.
              <div className="mt-2 space-x-2">
                <Button 
                  onClick={handleGenerateSchedule} 
                  disabled={isGenerating} 
                  variant="outline" 
                  size="sm"
                >
                  {isGenerating ? "Retrying..." : "Retry Generation"}
                </Button>
                <Button 
                  onClick={handleExportToExcel} 
                  variant="outline" 
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to Excel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Violations Details */}
        {violations.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-3">
              Violations Found ({violations.length}):
            </h3>
            <div className="space-y-2">
              {violations.map((violation, index) => (
                <div key={index} className="text-sm text-orange-700">
                  <span className="font-medium">
                    {violation.type === 'coverage' ? '📅 Coverage' : '👤 Personnel'}
                    {violation.person && ` (${violation.person})`}:
                  </span>
                  <span className="ml-2">{violation.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {(success || Object.keys(schedule).length > 0) && (
          <div className="space-y-4">
            <div className="text-center">
              <Button 
                onClick={handleExportToExcel} 
                variant="default"
                size="lg"
                className="px-8 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            <ResultsSection personnel={personnel} schedule={schedule} stats={stats} config={config} />
          </div>
        )}

        {/* Rules Reference */}
        <RulesReference />
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}