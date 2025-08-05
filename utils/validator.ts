import type { Config, Personnel } from "@/types"
import { format, isWeekend } from "date-fns"

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"
type ScheduleSlot = ShiftType | LeaveType

export class ScheduleValidator {
  private config: Config
  private personnel: Personnel[]
  private schedule: Record<string, Record<number, ScheduleSlot>>
  private year: number
  private month: number
  private daysInMonth: number

  constructor(
    config: Config,
    personnel: Personnel[],
    schedule: Record<string, Record<number, ScheduleSlot>>,
    year: number,
    month: number,
    daysInMonth: number
  ) {
    this.config = config
    this.personnel = personnel
    this.schedule = schedule
    this.year = year
    this.month = month
    this.daysInMonth = daysInMonth
  }

  public validateFinalSchedule(): Array<{ type: string, message: string, person?: string, day?: number }> {
    console.log(`\n=== FINAL SCHEDULE VALIDATION ===`)
    let totalViolations = 0
    const allViolations: Array<{ type: string, message: string, person?: string, day?: number }> = []

    // 1. Validate shift coverage per day
    const coverageViolations = this.validateShiftCoverage()
    if (coverageViolations.length > 0) {
      console.log(`\n❌ SHIFT COVERAGE VIOLATIONS:`)
      coverageViolations.forEach(violation => {
        console.log(`   ${violation}`)
        allViolations.push({ type: 'coverage', message: violation })
        totalViolations++
      })
    }

    // 2. Validate personnel violations
    for (const person of this.personnel) {
      const violations: string[] = []
      
      // Check sequence rules violations
      const sequenceViolations = this.checkSequenceViolations(person)
      violations.push(...sequenceViolations)
      
      // Check consecutive night shifts violations
      const consecutiveNightViolations = this.checkConsecutiveNightViolations(person)
      violations.push(...consecutiveNightViolations)
      
      // Check mandatory leave violations
      const mandatoryLeaveViolations = this.checkMandatoryLeaveViolations(person)
      violations.push(...mandatoryLeaveViolations)
      
      // Check consecutive work days violations
      const consecutiveWorkViolations = this.checkConsecutiveWorkViolations(person)
      violations.push(...consecutiveWorkViolations)
      
      // Check night shift limit violations
      const nightLimitViolations = this.checkNightLimitViolations(person)
      violations.push(...nightLimitViolations)
      
      // Check leave limit violations
      const leaveLimitViolations = this.checkLeaveLimitViolations(person)
      violations.push(...leaveLimitViolations)
      
      if (violations.length > 0) {
        console.log(`\n❌ ${person.name} has ${violations.length} violation(s):`)
        violations.forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation}`)
          allViolations.push({ type: 'personnel', message: violation, person: person.name })
        })
        totalViolations += violations.length
      } else {
        console.log(`✅ ${person.name}: No violations found`)
      }
    }

    if (totalViolations === 0) {
      console.log(`\n🎉 ALL PERSONNEL: No violations found!`)
    } else {
      console.log(`\n🚨 TOTAL VIOLATIONS FOUND: ${totalViolations}`)
    }
    console.log(`=== END VALIDATION ===\n`)
    
    return allViolations
  }

  private validateShiftCoverage(): string[] {
    const violations: string[] = []
    
    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(this.year, this.month, day)
      const dateString = format(date, "yyyy-MM-dd")
      
      // Get requirements for this day
      const requirements = this.getDailyRequirements(date)
      
      // Count actual assignments
      const actualP = this.countAssignedPersonnel(dateString, "P")
      const actualS = this.countAssignedPersonnel(dateString, "S") 
      const actualM = this.countAssignedPersonnel(dateString, "M")
      
      if (actualP < requirements.P) {
        violations.push(`Day ${day}: P shift shortage - need ${requirements.P}, have ${actualP}`)
      }
      if (actualS < requirements.S) {
        violations.push(`Day ${day}: S shift shortage - need ${requirements.S}, have ${actualS}`)
      }
      if (actualM < requirements.M) {
        violations.push(`Day ${day}: M shift shortage - need ${requirements.M}, have ${actualM}`)
      }
    }
    
    return violations
  }

  private getDailyRequirements(date: Date): {P: number, S: number, M: number} {
    const dateString = format(date, "yyyy-MM-dd")
    const specialDate = this.config.specialDates.find((sd) => sd.date === dateString)
    if (specialDate) {
      return { P: specialDate.P, S: specialDate.S, M: specialDate.M }
    }

    const dayOfMonth = date.getDate()
    const isHoliday = this.config.publicHolidays.includes(dayOfMonth)
    const isWeekendDay = isWeekend(date)

    if (isWeekendDay || isHoliday) {
      return { P: 2, S: 2, M: 3 } // Weekend/Holiday requirements
    }
    return { P: 1, S: 2, M: 2 } // Weekday requirements
  }

  private countAssignedPersonnel(dateString: string, shift: ShiftType): number {
    let count = 0
    for (const person of this.personnel) {
      if (this.schedule[dateString]?.[person.id] === shift) {
        count++
      }
    }
    return count
  }

  private checkSequenceViolations(person: Personnel): string[] {
    const violations: string[] = []
    
    for (let day = 2; day <= this.daysInMonth; day++) {
      const currentDate = format(new Date(this.year, this.month, day), "yyyy-MM-dd")
      const prevDate = format(new Date(this.year, this.month, day - 1), "yyyy-MM-dd")
      
      const currentShift = this.schedule[currentDate]?.[person.id]
      const prevShift = this.schedule[prevDate]?.[person.id]
      
      // Skip if either slot is a leave type
      if (!currentShift || !prevShift || 
          ["L", "LT", "CT"].includes(currentShift) || 
          ["L", "LT", "CT"].includes(prevShift)) {
        continue
      }
      
      // Check sequence rules
      let isValidSequence = true
      if (prevShift === "M" && currentShift !== "M") {
        isValidSequence = false
      } else if (prevShift === "S" && !["S", "M"].includes(currentShift)) {
        isValidSequence = false
      }
      
      if (!isValidSequence) {
        violations.push(`Invalid sequence on day ${day}: ${prevShift} → ${currentShift}`)
      }
    }
    
    return violations
  }

  private checkConsecutiveNightViolations(person: Personnel): string[] {
    const violations: string[] = []
    let consecutiveNights = 0
    let startDay = 0
    
    for (let day = 1; day <= this.daysInMonth; day++) {
      const currentDate = format(new Date(this.year, this.month, day), "yyyy-MM-dd")
      const currentShift = this.schedule[currentDate]?.[person.id]
      
      if (currentShift === "M") {
        if (consecutiveNights === 0) {
          startDay = day
        }
        consecutiveNights++
        
        if (consecutiveNights > 2) {
          violations.push(`More than 2 consecutive nights: days ${startDay}-${day} (${consecutiveNights} nights)`)
        }
      } else {
        consecutiveNights = 0
      }
    }
    
    return violations
  }

  private checkMandatoryLeaveViolations(person: Personnel): string[] {
    const violations: string[] = []
    
    for (let day = 1; day <= this.daysInMonth; day++) {
      const currentDate = format(new Date(this.year, this.month, day), "yyyy-MM-dd")
      const currentShift = this.schedule[currentDate]?.[person.id]
      
      if (currentShift === "M") {
        // Check if this is end of night sequence
        let isEndOfSequence = false
        if (day + 1 > this.daysInMonth) {
          isEndOfSequence = true
        } else {
          const nextDate = format(new Date(this.year, this.month, day + 1), "yyyy-MM-dd")
          const nextShift = this.schedule[nextDate]?.[person.id]
          isEndOfSequence = nextShift !== "M"
        }
        
        if (isEndOfSequence) {
          // Count consecutive nights
          let consecutiveNights = 1
          for (let i = 1; i <= 2; i++) {
            if (day - i < 1) break
            const prevDate = format(new Date(this.year, this.month, day - i), "yyyy-MM-dd")
            const prevShift = this.schedule[prevDate]?.[person.id]
            if (prevShift === "M") {
              consecutiveNights++
            } else {
              break
            }
          }
          
          // Check mandatory leave (must be L, not LT/CT)
          const leaveDaysNeeded = consecutiveNights >= 2 ? 2 : 1
          const nightsText = consecutiveNights === 1 ? "1 night" : `${consecutiveNights} consecutive nights`
          
          for (let leaveDay = 1; leaveDay <= leaveDaysNeeded; leaveDay++) {
            if (day + leaveDay > this.daysInMonth) continue
            
            const leaveDate = format(new Date(this.year, this.month, day + leaveDay), "yyyy-MM-dd")
            const leaveSlot = this.schedule[leaveDate]?.[person.id]
            
            // Must have some kind of leave, preferably L
            if (!leaveSlot || ["P", "S", "M"].includes(leaveSlot)) {
              violations.push(`Missing mandatory leave on day ${day + leaveDay} after ${nightsText} ending on day ${day}`)
            } else if (leaveSlot !== "L" && (leaveSlot === "LT" || leaveSlot === "CT")) {
              // Note: This is acceptable if it was pre-requested, but ideally should be L
              // violations.push(`Should use L (not ${leaveSlot}) for mandatory leave on day ${day + leaveDay} after ${nightsText}`)
            }
          }
        }
      }
    }
    
    return violations
  }

  private checkConsecutiveWorkViolations(person: Personnel): string[] {
    const violations: string[] = []
    let consecutiveDays = 0
    let startDay = 0
    
    for (let day = 1; day <= this.daysInMonth; day++) {
      const currentDate = format(new Date(this.year, this.month, day), "yyyy-MM-dd")
      const currentShift = this.schedule[currentDate]?.[person.id]
      
      if (currentShift && ["P", "S", "M"].includes(currentShift)) {
        if (consecutiveDays === 0) {
          startDay = day
        }
        consecutiveDays++
        
        if (consecutiveDays > 5) {
          violations.push(`More than 5 consecutive work days: days ${startDay}-${day} (${consecutiveDays} days)`)
        }
      } else {
        consecutiveDays = 0
      }
    }
    
    return violations
  }

  private checkNightLimitViolations(person: Personnel): string[] {
    const violations: string[] = []
    const nightShifts = this.countShiftsForPerson(person.id, "M")
    
    if (nightShifts > this.config.maxNightShifts) {
      violations.push(`Exceeded night shift limit: ${nightShifts}/${this.config.maxNightShifts}`)
    }
    
    return violations
  }

  private checkLeaveLimitViolations(person: Personnel): string[] {
    const violations: string[] = []
    const regularLeaves = this.countShiftsForPerson(person.id, "L")
    
    if (regularLeaves > this.config.maxDefaultLeaves) {
      violations.push(`Exceeded regular leave limit: ${regularLeaves}/${this.config.maxDefaultLeaves}`)
    }
    
    return violations
  }

  private countShiftsForPerson(personId: number, shiftType: ScheduleSlot): number {
    let count = 0
    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = format(new Date(this.year, this.month, day), "yyyy-MM-dd")
      if (this.schedule[date]?.[personId] === shiftType) {
        count++
      }
    }
    return count
  }
}
