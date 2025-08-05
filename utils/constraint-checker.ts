import type { Config, Personnel } from "@/types"
import { format, isWeekend } from "date-fns"
import { ScheduleUtils } from "./schedule-utils"

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"
type ScheduleSlot = ShiftType | LeaveType

export class ConstraintChecker {
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

  public isPersonAvailable(person: Personnel, date: Date, shift: ShiftType, hasEnoughNightCapacity: boolean = true): boolean {
    const dateString = format(date, "yyyy-MM-dd")

    // 1. Is already assigned to something on this day
    if (this.schedule[dateString][person.id]) {
      return false
    }

    // 2. Role-based restrictions
    if (person.role === "non_shift") {
      const isWeekday = !isWeekend(date) && !this.config.publicHolidays.includes(date.getDate())
      if (shift !== "P" || !isWeekday) {
        return false
      }
    }

    // 3. Check all rules
    const checks = {
        isValidSequence: this.isValidSequence(person, date, shift),
        isWithinNightLimit: this.isWithinNightLimit(person, shift),
        isWithinLeaveLimit: this.isWithinLeaveLimit(person),
        isWithinMaxConsecutiveWork: this.isWithinMaxConsecutiveWork(person, date),
        isWithinMaxConsecutiveNights: this.isWithinMaxConsecutiveNights(person, date, shift),
        canTakeMandatoryLeave: this.canTakeMandatoryLeaveIfNeeded(person, date, shift),
    };

    if (!checks.isValidSequence || !checks.isWithinNightLimit || 
        !checks.isWithinLeaveLimit || !checks.isWithinMaxConsecutiveWork ||
        !checks.isWithinMaxConsecutiveNights || !checks.canTakeMandatoryLeave) {
        return false;
    }

    // 4. Additional check for night shift capacity when we're running low
    if (shift === "M" && !hasEnoughNightCapacity) {
      const nightShifts = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
      const remainingCapacity = this.config.maxNightShifts - nightShifts
      // Only block if person has very little remaining capacity (0-1)
      if (remainingCapacity <= 1) {
        return false;
      }
    }

    return true
  }

  private isValidSequence(person: Personnel, date: Date, newShift: ShiftType): boolean {
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

  private isWithinNightLimit(person: Personnel, newShift: ShiftType): boolean {
    if (newShift !== "M") return true
    const nightShifts = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
    return nightShifts < this.config.maxNightShifts
  }

  private isWithinLeaveLimit(person: Personnel): boolean {
    const regularLeaves = ScheduleUtils.countShiftsForPerson(person.id, "L", this.schedule, this.year, this.month, this.daysInMonth)
    return regularLeaves < this.config.maxDefaultLeaves
  }

  private isWithinMaxConsecutiveWork(person: Personnel, date: Date): boolean {
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

  private isWithinMaxConsecutiveNights(person: Personnel, date: Date, newShift: ShiftType): boolean {
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

  private canTakeMandatoryLeaveIfNeeded(person: Personnel, date: Date, newShift: ShiftType): boolean {
    // Only check for night shifts
    if (newShift !== "M") return true
    
    const day = date.getDate()
    
    // Simulate: if we assign this night shift, will we need mandatory leave days?
    // And if so, are those days available (not occupied by CT/LT)?
    
    // Count consecutive nights this would create
    let consecutiveNights = 1 // This night shift
    
    // Check previous nights
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
    
    // Check if next day would also be night (to see if this is end of sequence)
    let wouldBeEndOfSequence = true
    if (day + 1 <= this.daysInMonth) {
      const nextDate = format(new Date(this.year, this.month, day + 1), "yyyy-MM-dd")
      const nextShift = this.schedule[nextDate]?.[person.id]
      if (nextShift === "M") {
        wouldBeEndOfSequence = false
      }
    }
    
    // If this would be end of sequence, check if we can assign mandatory leave
    if (wouldBeEndOfSequence) {
      const leaveDaysNeeded = consecutiveNights >= 2 ? 2 : 1
      
      for (let leaveDay = 1; leaveDay <= leaveDaysNeeded; leaveDay++) {
        if (day + leaveDay > this.daysInMonth) continue // End of month is okay
        
        const leaveDate = format(new Date(this.year, this.month, day + leaveDay), "yyyy-MM-dd")
        const existingSlot = this.schedule[leaveDate][person.id]
        
        // If slot is occupied by CT or LT, we cannot assign mandatory leave
        if (existingSlot && ["LT", "CT"].includes(existingSlot)) {
          console.log(`[CONSTRAINT] ${person.name} cannot work night on day ${day} - needs mandatory leave on day ${day + leaveDay} but has ${existingSlot}`)
          return false
        }
      }
    }
    
    return true
  }

  public checkFutureNightShiftAvailability(date: Date): boolean {
    // Check if we have enough people with remaining night shift capacity
    // for the remaining days in the month
    const currentDay = date.getDate()
    
    // Estimate remaining night shifts needed (rough calculation)
    let estimatedNightShiftsNeeded = 0
    for (let day = currentDay; day <= this.daysInMonth; day++) {
      const checkDate = new Date(this.year, this.month, day)
      const requirements = ScheduleUtils.getDailyRequirements(checkDate, this.config)
      estimatedNightShiftsNeeded += requirements.M
    }
    
    // Count people with remaining night shift capacity
    let availableNightShiftCapacity = 0
    for (const person of this.personnel) {
      if (person.role !== "shift") continue
      const currentNightShifts = ScheduleUtils.countShiftsForPerson(person.id, "M", this.schedule, this.year, this.month, this.daysInMonth)
      const remainingCapacity = this.config.maxNightShifts - currentNightShifts
      availableNightShiftCapacity += remainingCapacity
    }
    
    // Use a smaller safety buffer (10% instead of 20%) to be less restrictive
    const safetyBuffer = Math.ceil(estimatedNightShiftsNeeded * 0.1)
    return availableNightShiftCapacity >= (estimatedNightShiftsNeeded + safetyBuffer)
  }
}
