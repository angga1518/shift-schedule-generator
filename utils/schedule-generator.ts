import type { Config, Personnel, Schedule } from "@/types"
import { getDaysInMonth, format, isWeekend } from "date-fns"
import { ScheduleValidator } from "./validator"
import { ScheduleUtils } from "./schedule-utils"
import { ConstraintChecker } from "./constraint-checker"
import { PersonnelSelector } from "./personnel-selector"
import { calculateStats } from "./statistics"

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"
type ScheduleSlot = ShiftType | LeaveType

type ScheduleResult = {
  success: boolean
  schedule: Schedule
  stats: {
    coverage: Record<string, any>
    workload: Record<string, any>
  }
  error?: string
}

export class ScheduleGenerator {
  private config: Config
  private personnel: Personnel[]
  private schedule: Record<string, Record<number, ScheduleSlot>> = {}
  private year: number
  private month: number
  private daysInMonth: number
  private constraintChecker: ConstraintChecker
  private personnelSelector: PersonnelSelector
  private onProgress?: (attempt: number, maxAttempts: number, violations: number) => void

  constructor(config: Config, personnel: Personnel[], onProgress?: (attempt: number, maxAttempts: number, violations: number) => void) {
    this.config = config
    this.personnel = personnel
    this.onProgress = onProgress
    const [year, month] = config.month.split("-").map(Number)
    this.year = year
    this.month = month - 1 // date-fns uses 0-indexed months
    this.daysInMonth = getDaysInMonth(new Date(this.year, this.month))

    // Initialize schedule first
    this.schedule = ScheduleUtils.initializeSchedule(this.year, this.month, this.daysInMonth)

    // Initialize helper classes
    this.constraintChecker = new ConstraintChecker(config, personnel, this.schedule, this.year, this.month, this.daysInMonth)
    this.personnelSelector = new PersonnelSelector(config, personnel, this.schedule, this.year, this.month, this.daysInMonth)
  }

  // Method to update helper classes when schedule changes
  private updateHelperClasses() {
    this.constraintChecker = new ConstraintChecker(this.config, this.personnel, this.schedule, this.year, this.month, this.daysInMonth)
    this.personnelSelector = new PersonnelSelector(this.config, this.personnel, this.schedule, this.year, this.month, this.daysInMonth)
  }

  async generate(): Promise<ScheduleResult> {
    try {
      const schedule = await this.generateSchedule()

      return {
        success: true,
        schedule,
        stats: {
          coverage: calculateStats(this.personnel, schedule),
          workload: calculateStats(this.personnel, schedule)
        }
      }
    } catch (error) {
      console.error("Schedule generation failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        schedule: {},
        stats: { coverage: {}, workload: {} }
      }
    }
  }

  public async generateSchedule(): Promise<Schedule> {
    const maxRetries = 20
    let bestSchedule: Schedule = {}
    let bestViolations: any[] = []
    let minViolationCount = Infinity

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`\n=== GENERATION ATTEMPT ${attempt}/${maxRetries} ===`)

      try {
        // Reset schedule for each attempt
        this.schedule = ScheduleUtils.initializeSchedule(this.year, this.month, this.daysInMonth)
        this.updateHelperClasses()

        // Generate the schedule
        await this.generateSingleAttempt()

        // Validate and get violations
        const validator = new ScheduleValidator(this.config, this.personnel, this.schedule, this.year, this.month, this.daysInMonth)
        const violations = validator.validateFinalSchedule()

        const violationCount = violations.length
        console.log(`[ATTEMPT ${attempt}] Generated schedule with ${violationCount} violations`)

        // Notify progress
        if (this.onProgress) {
          this.onProgress(attempt, maxRetries, violationCount)
        }

        // If no violations, we're done!
        if (violationCount === 0) {
          console.log(`✅ Perfect schedule found on attempt ${attempt}!`)
          return ScheduleUtils.formatScheduleToPublicInterface(this.schedule)
        }

        // Track the best attempt so far
        if (violationCount < minViolationCount) {
          minViolationCount = violationCount
          bestSchedule = ScheduleUtils.formatScheduleToPublicInterface(this.schedule)
          bestViolations = violations
          console.log(`📝 New best attempt: ${violationCount} violations`)
        }

      } catch (error) {
        console.log(`[ATTEMPT ${attempt}] Failed with error:`, error)
        // Continue to next attempt
      }
    }

    // If we get here, we've exhausted all attempts
    console.log(`\n⚠️ Completed ${maxRetries} attempts. Best result: ${minViolationCount} violations`)

    // Store violations in the schedule result for FE to display
    if (bestSchedule && Object.keys(bestSchedule).length > 0) {
      (bestSchedule as any)._violations = bestViolations
      return bestSchedule
    }

    throw new Error(`Failed to generate schedule after ${maxRetries} attempts`)
  }

  private async generateSingleAttempt(): Promise<void> {
    this.applyInitialLeaves()

    // Update helper classes after initial leaves are applied
    this.updateHelperClasses()

    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(this.year, this.month, day)
      const dateString = format(date, "yyyy-MM-dd")
      const requirements = ScheduleUtils.getDailyRequirements(date, this.config)

      // Re-sort personnel every few days for better distribution
      const sortedPersonnel = (day % 3 === 1) ?
        ScheduleUtils.sortPersonnel(this.personnel, this.schedule, this.year, this.month, this.daysInMonth) :
        ScheduleUtils.sortPersonnel(this.personnel, this.schedule, this.year, this.month, this.daysInMonth)

      // Check if we're running low on night shift capacity
      const hasEnoughNightCapacity = this.constraintChecker.checkFutureNightShiftAvailability(date)

      for (const shift of ["P", "S", "M"] as ShiftType[]) {
        const requiredCount = requirements[shift]
        const assignedPersonnel = ScheduleUtils.getAssignedPersonnel(this.schedule, dateString, shift)

        for (let i = assignedPersonnel.length; i < requiredCount; i++) {
          const availablePerson = this.personnelSelector.findAvailablePersonnel(date, shift, sortedPersonnel, hasEnoughNightCapacity)
          if (!availablePerson) {
            // If we can't find anyone for night shift, try emergency fallback
            if (shift === "M") {
              const emergencyPerson = this.personnelSelector.findEmergencyNightShiftPersonnel(date, sortedPersonnel)
              if (emergencyPerson) {
                this.schedule[dateString][emergencyPerson.id] = shift
                continue
              }
            }
            throw new Error(
              `Could not find available personnel for shift ${shift} on ${dateString}. Please check your constraints.`
            )
          }
          this.schedule[dateString][availablePerson.id] = shift
        }
      }
    }

    // Apply mandatory leaves AFTER all shifts are assigned
    this.applyMandatoryLeaves()

    // Update helper classes after mandatory leaves
    this.updateHelperClasses()

    // Fix any gaps created by mandatory leave overrides
    this.fillMissingAssignments()
  }

  private applyInitialLeaves() {
    for (const person of this.personnel) {
      person.requestedLeaves.forEach((day) => ScheduleUtils.assignLeave(day, person.id, "L", this.schedule, this.year, this.month, this.daysInMonth))
      person.requestedExtraLeaves.forEach((day) => ScheduleUtils.assignLeave(day, person.id, "LT", this.schedule, this.year, this.month, this.daysInMonth))
      person.requestedAnnualLeaves.forEach((day) => ScheduleUtils.assignLeave(day, person.id, "CT", this.schedule, this.year, this.month, this.daysInMonth))
    }
  }

  private applyMandatoryLeaves() {
    // Rule: After night shifts, assign mandatory leave days
    // - After 1 night shift (alone): 1 day leave
    // - After 2 consecutive night shifts: 2 days leave

    // We need to do this iteratively since assigning leaves affects future assignments
    let changesMade = true
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops

    while (changesMade && iterations < maxIterations) {
      changesMade = false
      iterations++

      for (let day = 1; day <= this.daysInMonth; day++) {
        const currentDate = format(new Date(this.year, this.month, day), "yyyy-MM-dd")

        for (const person of this.personnel) {
          if (person.role !== "shift") continue // Only applies to shift personnel

          const currentShift = this.schedule[currentDate]?.[person.id]

          // If worked M (night) shift, check if this is the END of a night shift sequence
          if (currentShift === "M") {
            // Check if next day is NOT a night shift (end of sequence)
            let isEndOfSequence = false
            if (day + 1 > this.daysInMonth) {
              isEndOfSequence = true // End of month
            } else {
              const nextDate = format(new Date(this.year, this.month, day + 1), "yyyy-MM-dd")
              const nextShift = this.schedule[nextDate]?.[person.id]
              isEndOfSequence = nextShift !== "M"
            }

            if (isEndOfSequence) {
              // Count how many consecutive nights ending at this day
              let consecutiveNights = 1 // Current night

              // Check previous days for consecutive nights (check more days back)
              for (let i = 1; i <= 2; i++) { // Check up to 2 days back for sequences
                if (day - i < 1) break
                const prevDate = format(new Date(this.year, this.month, day - i), "yyyy-MM-dd")
                const prevShift = this.schedule[prevDate]?.[person.id]
                if (prevShift === "M") {
                  consecutiveNights++
                } else {
                  break
                }
              }

              // Assign leave days based on consecutive nights
              let leaveDaysNeeded = consecutiveNights >= 2 ? 2 : 1

              // Assign leave for the required number of days after this night shift
              for (let leaveDay = 1; leaveDay <= leaveDaysNeeded; leaveDay++) {
                if (day + leaveDay > this.daysInMonth) break

                const leaveDate = format(new Date(this.year, this.month, day + leaveDay), "yyyy-MM-dd")
                const existingSlot = this.schedule[leaveDate][person.id]

                if (!existingSlot) {
                  // Slot is empty, assign mandatory leave
                  this.schedule[leaveDate][person.id] = "L"
                  changesMade = true
                } else if (existingSlot === "L") {
                  // Already has mandatory leave, no change needed
                } else if (["LT", "CT"].includes(existingSlot)) {
                  // CT/LT already exists, cannot override - this is fine, person is still off
                } else {
                  // Slot has a shift assigned - this means we have a conflict
                  // This should be prevented by the constraint checking during shift assignment
                  // For now, we'll respect the mandatory leave rule and override the shift
                  this.schedule[leaveDate][person.id] = "L"
                  changesMade = true
                }
              }
            }
          }
        }
      }
    }
  }

  private fillMissingAssignments() {
    console.log(`\n=== FILLING MISSING ASSIGNMENTS ===`)

    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(this.year, this.month, day)
      const dateString = format(date, "yyyy-MM-dd")
      const requirements = ScheduleUtils.getDailyRequirements(date, this.config)

      // Check each shift type for gaps
      for (const shift of ["P", "S", "M"] as ShiftType[]) {
        const requiredCount = requirements[shift]
        const assignedPersonnel = ScheduleUtils.getAssignedPersonnel(this.schedule, dateString, shift)
        const shortage = requiredCount - assignedPersonnel.length

        if (shortage > 0) {
          console.log(`[FILL] Day ${day} ${shift}: Need ${shortage} more personnel (${assignedPersonnel.length}/${requiredCount})`)

          // Try to fill the gap
          const sortedPersonnel = ScheduleUtils.sortPersonnel(this.personnel, this.schedule, this.year, this.month, this.daysInMonth)

          for (let i = 0; i < shortage; i++) {
            // Find anyone available using basic constraints
            let foundPerson = null

            // Strategy 1: Find anyone available without strict constraint checking
            for (const person of sortedPersonnel) {
              // Skip if already assigned
              if (this.schedule[dateString][person.id]) continue

              // Role check for non-shift personnel
              if (person.role === "non_shift") {
                const isWeekday = !isWeekend(date) && !this.config.publicHolidays.includes(date.getDate())
                if (shift !== "P" || !isWeekday) continue
              }

              // Must be shift personnel for night shifts
              if (shift === "M" && person.role !== "shift") continue

              // Basic sequence checking to avoid obvious violations
              let canAssign = true
              if (day > 1) {
                const prevDate = new Date(this.year, this.month, day - 1)
                const prevDateString = format(prevDate, "yyyy-MM-dd")
                const prevShift = this.schedule[prevDateString]?.[person.id]

                // Don't create sequence violations
                if (prevShift === "S" && shift === "P") canAssign = false
                if (prevShift === "M" && (shift === "P" || shift === "S")) canAssign = false
              }

              // Check next day to avoid creating future sequence violations
              if (canAssign && day < this.daysInMonth) {
                const nextDate = new Date(this.year, this.month, day + 1)
                const nextDateString = format(nextDate, "yyyy-MM-dd")
                const nextShift = this.schedule[nextDateString]?.[person.id]

                // Avoid creating future violations
                if (shift === "S" && nextShift === "P") canAssign = false
                if (shift === "M" && nextShift && nextShift !== "M" && !["L", "LT", "CT"].includes(nextShift)) canAssign = false
              }

              if (canAssign) {
                foundPerson = person
                break
              }
            }

            if (foundPerson) {
              this.schedule[dateString][foundPerson.id] = shift
              console.log(`[FILL] ✅ Assigned ${foundPerson.name} to ${shift} on day ${day}`)
            } else {
              // Strategy 2: Ultra-relaxed assignment for critical gaps (only for S and P shifts)
              if (shift !== "M") {
                console.log(`[FILL] Trying ultra-relaxed assignment for ${shift} on day ${day}`)
                for (const person of sortedPersonnel) {
                  // Skip if already assigned
                  if (this.schedule[dateString][person.id]) continue

                  // NEVER override mandatory leaves
                  if (["L", "LT", "CT"].includes(this.schedule[dateString][person.id])) continue

                  // Role check - allow shift personnel for any shift
                  if (person.role === "shift") {
                    // Only basic sequence check to avoid major violations
                    let canAssign = true
                    if (day > 1) {
                      const prevDate = new Date(this.year, this.month, day - 1)
                      const prevDateString = format(prevDate, "yyyy-MM-dd")
                      const prevShift = this.schedule[prevDateString]?.[person.id]

                      // Only avoid the most critical sequence violations
                      if (prevShift === "M" && (shift === "P" || shift === "S")) canAssign = false
                    }

                    if (canAssign) {
                      foundPerson = person
                      console.log(`[FILL] ✅ Ultra-relaxed assignment: ${foundPerson.name} to ${shift} on day ${day}`)
                      this.schedule[dateString][foundPerson.id] = shift
                      break
                    }
                  }
                }
              }

              if (!foundPerson) {
                console.log(`[FILL] ❌ Could not find replacement for ${shift} on day ${day}`)
              }
            }
          }
        }
      }
    }

    console.log(`=== FILLING COMPLETE ===\n`)
  }
}