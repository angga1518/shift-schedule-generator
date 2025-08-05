"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar, Settings, Plus, X } from "lucide-react"
import { NumberChipInput } from "@/components/ui/number-chip-input"
import type { Config } from "@/types"

interface ConfigSectionProps {
  config: Config
  setConfig: (config: Config) => void
  specialDateForm: {
    date: string
    P: string
    S: string
    M: string
  }
  setSpecialDateForm: (form: any) => void
  onAddSpecialDate: () => void
  onRemoveSpecialDate: (id: string) => void
}

export function ConfigSection({
  config,
  setConfig,
  specialDateForm,
  setSpecialDateForm,
  onAddSpecialDate,
  onRemoveSpecialDate,
}: ConfigSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Schedule Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Label htmlFor="month">Month & Year</Label>
            <div className="relative">
              <Input
                id="month"
                type="month"
                value={config.month}
                onChange={(e) => setConfig({ ...config, month: e.target.value })}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="maxNight">Max Night Shifts</Label>
            <Input
              id="maxNight"
              type="number"
              value={config.maxNightShifts}
              onChange={(e) => setConfig({ ...config, maxNightShifts: Number.parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="maxLeave">Max Default Leaves</Label>
            <Input
              id="maxLeave"
              type="number"
              value={config.maxDefaultLeaves}
              onChange={(e) => setConfig({ ...config, maxDefaultLeaves: Number.parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Public Holidays */}
        <div className="space-y-3">
          <Label htmlFor="holidays">Public Holidays</Label>
          <NumberChipInput
            value={config.publicHolidays}
            onChange={(value) => setConfig({ ...config, publicHolidays: value })}
            placeholder="Type day number and press space (e.g., 17)"
            maxValue={31}
          />
          <p className="text-sm text-gray-500">Type day numbers (1-31) and press space to add them as chips</p>
        </div>

        {/* Special Date Configurations */}
        <div className="space-y-4">
          <Label>Special Date Configurations</Label>
          <div className="p-6 border rounded-lg bg-gray-50 space-y-4">
            <p className="text-sm text-gray-600">Override default staffing for specific dates</p>

            {/* Add Special Date Form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={specialDateForm.date}
                  onChange={(e) => setSpecialDateForm({ ...specialDateForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Morning (P)</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={specialDateForm.P}
                  onChange={(e) => setSpecialDateForm({ ...specialDateForm, P: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Afternoon (S)</Label>
                <Input
                  type="number"
                  placeholder="2"
                  value={specialDateForm.S}
                  onChange={(e) => setSpecialDateForm({ ...specialDateForm, S: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Night (M)</Label>
                <Input
                  type="number"
                  placeholder="3"
                  value={specialDateForm.M}
                  onChange={(e) => setSpecialDateForm({ ...specialDateForm, M: e.target.value })}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddSpecialDate}
                disabled={!specialDateForm.date || !specialDateForm.P || !specialDateForm.S || !specialDateForm.M}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Display Added Special Dates */}
            {config.specialDates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Added Special Dates:</Label>
                <div className="space-y-2">
                  {config.specialDates.map((specialDate) => (
                    <div key={specialDate.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">{new Date(specialDate.date).toLocaleDateString()}</span>
                        <span>P: {specialDate.P}</span>
                        <span>S: {specialDate.S}</span>
                        <span>M: {specialDate.M}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onRemoveSpecialDate(specialDate.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
