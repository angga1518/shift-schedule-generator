import type { Config, Personnel } from "@/types"
import { format, isWeekend } from "date-fns"
import { ScheduleUtils } from "./schedule-utils"
import { ConstraintChecker } from "./constraint-checker"

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"
type ScheduleSlot = ShiftType | LeaveType

export class PersonnelSelector {
  private config: Config
  private personnel: Personnel[]
  private schedule: Record<string, Record<number, ScheduleSlot>>
  private year: number
  private month: number
  private daysInMonth: number
  private constraintChecker: ConstraintChecker

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
    this.constraintChecker = new ConstraintChecker(config, personnel, schedule, year, month, daysInMonth)
  }

  public findAvailablePersonnel(date: Date, shift: ShiftType, personnelList: Personnel[], hasEnoughNightCapacity: boolean = true): Personnel | null {
    const dateString = format(date, "yyyy-MM-dd");

    // Prioritize shift personnel, then non_shift for Morning shifts on weekdays
    const shiftPersonnel = personnelList.filter((p) => p.role === "shift")
    const nonShiftPersonnel = personnelList.filter((p) => p.role === "non_shift")

    // Find all available shift personnel first
    const availableShiftPersonnel = shiftPersonnel.filter(person => {
      return this.constraintChecker.isPersonAvailable(person, date, shift, hasEnoughNightCapacity)
    })

    // If we have available shift personnel, select the best one based on workload
    if (availableShiftPersonnel.length > 0) {
      const bestPerson = this.selectBestPersonForShift(availableShiftPersonnel, shift)
      return bestPerson
    }

    // Fallback to non_shift for Morning shifts on weekdays
    const isWeekday = !isWeekend(date) && !this.config.publicHolidays.includes(date.getDate())
    if (shift === "P" && isWeekday) {
      for (const person of nonShiftPersonnel) {
        if (this.constraintChecker.isPersonAvailable(person, date, shift, hasEnoughNightCapacity)) {
          return person
        }
      }
    }

    // Only log when we can't find anyone (this is the important case)
    console.log(`No personnel found for shift ${shift} on ${dateString}`);
    return null
  }

  public selectBestPersonForShift(availablePersonnel: Personnel[], shift: ShiftType): Personnel {
    // Calculate scores for each person based on:
    // 1. Total workload (lower is better)
    // 2. Specific shift type count (lower is better) 
    // 3. Night shift count with future consideration
    // 4. Distance from night shift limit
    // 5. Add some randomness for variety
    
    const scoredPersonnel = availablePersonnel.map(person => {
      const totalShifts = ScheduleUtils.countShiftsForPerson(person.id, "P", this.schedule, this.year, this.month, this.daysInMonth) + 
                         ScheduleUtils.countShiftsForPerson(person.id, "S", this.schedule, this.year, this.month, this.daysInMonth) + 
                         ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
                         
      const specificShiftCount = ScheduleUtils.countShiftsForPerson(person.id, shift, this.schedule, this.year, this.month, this.daysInMonth)
      const nightShiftCount = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
      
      // Base score: prefer people with fewer shifts
      let score = totalShifts * 5 + specificShiftCount * 8
      
      // For night shifts, be less aggressive about avoiding people close to limit
      // This allows more even distribution throughout the month
      if (shift === "M") {
        const remainingNightShifts = this.config.maxNightShifts - nightShiftCount
        // Only heavily penalize if very close to limit (1 or 0 remaining)
        if (remainingNightShifts <= 1) {
          score += 500 // High penalty for those very close to limit
        } else if (remainingNightShifts <= 3) {
          score += 50 // Medium penalty 
        } else {
          score += nightShiftCount * 10 // Normal night shift balancing
        }
      }
      
      // For non-night shifts, slightly prefer people with high night shift count
      // This helps preserve people with low night shift count for night shifts
      if (shift !== "M") {
        const remainingNightShifts = this.config.maxNightShifts - nightShiftCount
        if (remainingNightShifts <= 1) {
          score -= 10 // Bonus for using people with very little night capacity for non-night shifts
        } else if (remainingNightShifts >= 6) {
          score += 5 // Small penalty for using people with lots of night capacity for non-night shifts
        }
      }
      
      // Add small random factor for variety (0-3 points)
      score += Math.random() * 3
      
      return { person, score }
    })
    
    // Sort by score (lowest first) and return the best person
    scoredPersonnel.sort((a, b) => a.score - b.score)
    return scoredPersonnel[0].person
  }

  public findEmergencyNightShiftPersonnel(date: Date, personnelList: Personnel[]): Personnel | null {
    const dateString = format(date, "yyyy-MM-dd");

    // In emergency, relax some constraints but maintain critical ones
    const shiftPersonnel = personnelList.filter((p) => p.role === "shift")
    
    // Try different levels of emergency relaxation
    
    // Level 1: Allow people at exactly the night shift limit but still respect consecutive rules
    for (const person of shiftPersonnel) {
      if (this.schedule[dateString][person.id]) continue
      if (!this.isValidSequenceEmergency(person, date, "M")) continue
      if (!this.isWithinMaxConsecutiveWorkEmergency(person, date)) continue
      if (!this.isWithinMaxConsecutiveNightsEmergency(person, date, "M")) continue
      
      const nightShifts = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
      if (nightShifts >= this.config.maxNightShifts + 1) continue // Allow +1 over limit
      
      console.log(`Emergency assignment: ${person.name} for night shift on ${dateString}`);
      return person
    }
    
    // Level 2: Allow people who exceed work limit by 1 day but still respect night consecutive limit
    for (const person of shiftPersonnel) {
      if (this.schedule[dateString][person.id]) continue
      if (!this.isValidSequenceEmergency(person, date, "M")) continue
      if (!this.isWithinMaxConsecutiveNightsEmergency(person, date, "M")) continue // Keep night consecutive strict
      
      const nightShifts = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
      if (nightShifts >= this.config.maxNightShifts + 1) continue
      
      // Check if they're only 1 day over consecutive work limit
      let consecutiveDays = 0
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(date)
        checkDate.setDate(date.getDate() - i)
        if (checkDate.getMonth() !== this.month || checkDate.getFullYear() !== this.year) break

        const checkDateString = format(checkDate, "yyyy-MM-dd")
        const shift = this.schedule[checkDateString]?.[person.id]

        if (shift && ["P", "S", "M"].includes(shift)) {
          consecutiveDays++
        } else {
          break
        }
      }
      
      if (consecutiveDays <= 6) { // Allow up to 6 consecutive days in emergency (1 more than normal)
        console.log(`Emergency assignment (relaxed consecutive): ${person.name} for night shift on ${dateString}`);
        return person
      }
    }
    
    return null
  }

  private isValidSequenceEmergency(person: Personnel, date: Date, newShift: ShiftType): boolean {
    if (date.getDate() === 1) return true // No previous day to check

    const prevDate = new Date(date)
    prevDate.setDate(date.getDate() - 1)
    const prevDateString = format(prevDate, "yyyy-MM-dd")
    const prevShift = this.schedule[prevDateString]?.[person.id]

    if (!prevShift || ["L", "LT", "CT"].includes(prevShift)) {
      return true
    }

    // Rule 1: After Night (M) -> only M or L (L is handled by leave assignment)
    if (prevShift === "M") {
      return newShift === "M"
    }
    // Rule 2: After Afternoon (S) -> only S, M, or L (L is handled by leave assignment)  
    if (prevShift === "S") {
      return newShift === "S" || newShift === "M"
    }
    // Rule 3: After Morning (P) -> can be P, S, M, or L (L is handled by leave assignment)
    if (prevShift === "P") {
      return true
    }
    
    return true
  }

  private isWithinMaxConsecutiveWorkEmergency(person: Personnel, date: Date): boolean {
    let consecutiveDays = 0
    for (let i = 0; i < 6; i++) { // Check up to 6 days back
      const checkDate = new Date(date)
      checkDate.setDate(date.getDate() - i)
      if (checkDate.getMonth() !== this.month || checkDate.getFullYear() !== this.year) break

      const checkDateString = format(checkDate, "yyyy-MM-dd")
      const shift = this.schedule[checkDateString]?.[person.id]

      if (shift && ["P", "S", "M"].includes(shift)) {
        consecutiveDays++
      } else {
        break
      }
    }
    // Allow up to 5 consecutive days maximum
    return consecutiveDays < 5
  }

  private isWithinMaxConsecutiveNightsEmergency(person: Personnel, date: Date, newShift: ShiftType): boolean {
    // Only check if assigning a night shift
    if (newShift !== "M") return true
    
    let consecutiveNights = 0
    for (let i = 1; i <= 3; i++) { // Check up to 3 days back to catch any pattern
      const checkDate = new Date(date)
      checkDate.setDate(date.getDate() - i)
      if (checkDate.getMonth() !== this.month || checkDate.getFullYear() !== this.year) break

      const checkDateString = format(checkDate, "yyyy-MM-dd")
      const shift = this.schedule[checkDateString]?.[person.id]

      if (shift === "M") {
        consecutiveNights++
      } else {
        break
      }
    }
    // Strict: Maximum 2 consecutive night shifts, so if already worked 2 nights in a row, cannot work another
    // This means if consecutiveNights >= 2, return false
    return consecutiveNights < 2
  }
}
