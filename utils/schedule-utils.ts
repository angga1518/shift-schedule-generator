import type { Config, Personnel, Schedule } from "@/types"
import { format, isWeekend } from "date-fns"

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"
type ScheduleSlot = ShiftType | LeaveType

interface DayRequirements {
  P: number
  S: number
  M: number
}

export class ScheduleUtils {
  static getDailyRequirements(date: Date, config: Config): DayRequirements {
    const dateString = format(date, "yyyy-MM-dd")
    const specialDate = config.specialDates.find((sd) => sd.date === dateString)
    if (specialDate) {
      return { P: specialDate.P, S: specialDate.S, M: specialDate.M }
    }

    const dayOfMonth = date.getDate()
    const isHoliday = config.publicHolidays.includes(dayOfMonth)
    const isWeekendDay = isWeekend(date)

    if (isWeekendDay || isHoliday) {
      return { P: 2, S: 2, M: 3 } // Weekend/Holiday requirements
    }
    return { P: 1, S: 2, M: 2 } // Weekday requirements
  }

  static countShiftsForPerson(
    personId: number, 
    shiftType: ScheduleSlot, 
    schedule: Record<string, Record<number, ScheduleSlot>>,
    year: number,
    month: number,
    daysInMonth: number
  ): number {
    let count = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const date = format(new Date(year, month, day), "yyyy-MM-dd")
      if (schedule[date]?.[personId] === shiftType) {
        count++
      }
    }
    return count
  }

  static getAssignedPersonnel(schedule: Record<string, Record<number, ScheduleSlot>>, dateString: string, shift: ShiftType): number[] {
    const personnelIds: number[] = []
    const daySchedule = schedule[dateString]
    for (const personId in daySchedule) {
      if (daySchedule[personId] === shift) {
        personnelIds.push(Number(personId))
      }
    }
    return personnelIds
  }

  static formatScheduleToPublicInterface(schedule: Record<string, Record<number, ScheduleSlot>>): Schedule {
    const publicSchedule: Schedule = {}
    for (const date in schedule) {
      publicSchedule[date] = { P: [], S: [], M: [] }
      for (const personId in schedule[date]) {
        const shift = schedule[date][personId]
        if (["P", "S", "M"].includes(shift)) {
          publicSchedule[date][shift as ShiftType].push(Number(personId))
        }
      }
    }
    return publicSchedule
  }

  static sortPersonnel(
    personnel: Personnel[], 
    schedule: Record<string, Record<number, ScheduleSlot>>,
    year: number,
    month: number,
    daysInMonth: number
  ): Personnel[] {
    // Create a shuffled copy of personnel for more randomization
    const shuffled = [...personnel]
    
    // Shuffle the array using Fisher-Yates algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    // Sort by workload but with some randomness
    return shuffled.sort((a, b) => {
      const aTotalShifts = this.countShiftsForPerson(a.id, "P", schedule, year, month, daysInMonth) + 
                          this.countShiftsForPerson(a.id, "S", schedule, year, month, daysInMonth) + 
                          this.countShiftsForPerson(a.id, "M", schedule, year, month, daysInMonth)
      const bTotalShifts = this.countShiftsForPerson(b.id, "P", schedule, year, month, daysInMonth) + 
                          this.countShiftsForPerson(b.id, "S", schedule, year, month, daysInMonth) + 
                          this.countShiftsForPerson(b.id, "M", schedule, year, month, daysInMonth)
      
      // If the difference is small (0-1 shifts), add randomness
      const difference = aTotalShifts - bTotalShifts
      if (Math.abs(difference) <= 1) {
        return Math.random() - 0.5 // Random order for similar workloads
      }
      
      return difference // Normal sorting for significantly different workloads
    })
  }

  static initializeSchedule(year: number, month: number, daysInMonth: number): Record<string, Record<number, ScheduleSlot>> {
    const schedule: Record<string, Record<number, ScheduleSlot>> = {}
    for (let day = 1; day <= daysInMonth; day++) {
      const date = format(new Date(year, month, day), "yyyy-MM-dd")
      schedule[date] = {}
    }
    return schedule
  }

  static assignLeave(
    day: number, 
    personId: number, 
    leaveType: LeaveType, 
    schedule: Record<string, Record<number, ScheduleSlot>>,
    year: number,
    month: number,
    daysInMonth: number
  ): void {
    if (day > 0 && day <= daysInMonth) {
      const date = format(new Date(year, month, day), "yyyy-MM-dd")
      schedule[date][personId] = leaveType
    }
  }
}
