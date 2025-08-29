export interface Personnel {
  id: number
  name: string
  role: "shift" | "non_shift"
  requestedLeaves: number[]
  requestedExtraLeaves: number[]
  requestedAnnualLeaves: number[]
}

export interface SpecialDate {
  id: string
  date: string
  P: number
  S: number
  M: number
}

export interface Config {
  month: string
  publicHolidays: number[]
  specialDates: SpecialDate[]
  maxNightShifts: number
  maxDefaultLeaves: number
  maxNonShift?: number | null // Optional: Max non-shift personnel per day (null = no limit)
}

export interface Schedule {
  [date: string]: {
    P: number[]
    S: number[]
    M: number[]
  }
}

export interface PersonnelStats {
  name: string
  totalMorning: number
  totalAfternoon: number
  totalNight: number
  totalLeave: number
  totalExtraLeave: number
  totalAnnualLeave: number
}

export interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

export interface NumberChipInputProps {
  value: number[]
  onChange: (value: number[]) => void
  placeholder?: string
  className?: string
  maxValue?: number
}
