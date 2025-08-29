import { getDefaultMonth } from "@/hooks/use-config"
import type { Config, Personnel } from "@/types"

export const dummyConfig: Config = {
  month: "2025-09", // September 2025
  publicHolidays: [5],
  specialDates: [
    {
      id: "1",
      date: "2025-09-20",
      P: 2,
      S: 2,
      M: 3,
    },
  ],
  maxNightShifts: 9,
  maxDefaultLeaves: 10,
  maxNonShift: 2, // Max 2 non-shift personnel per day
}

export const dummyPersonnel: Personnel[] = [
  { id: 1, name: "Andi", role: "shift", requestedLeaves: [5], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 2, name: "Budi", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 3, name: "Citra", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [29] },
  { id: 4, name: "Dedi", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 5, name: "Eka", role: "shift", requestedLeaves: [15], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 6, name: "Gita", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 7, name: "Hani", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 8, name: "Indra", role: "shift", requestedLeaves: [10], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 9, name: "Joko", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 10, name: "Fani", role: "non_shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
]

export const hardDummyPersonnel: Personnel[] = [
  { id: 1, name: "dr. LARAS W", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 2, name: "dr. SITI AISYAH", role: "shift", requestedLeaves: [6, 7], requestedExtraLeaves: [12, 13, 14, 27, 28], requestedAnnualLeaves: [] },
  { id: 3, name: "dr. RABIATUL H", role: "shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
  { id: 4, name: "dr. ADIE K", role: "shift", requestedLeaves: [], requestedExtraLeaves: [25, 26, 27], requestedAnnualLeaves: [] },
  { id: 5, name: "dr. LOKOT", role: "shift", requestedLeaves: [9, 10], requestedExtraLeaves: [11, 12, 13, 14, 15], requestedAnnualLeaves: [] },
  { id: 6, name: "dr. VENEZIA A", role: "shift", requestedLeaves: [16, 17], requestedExtraLeaves: [18, 19], requestedAnnualLeaves: [] },
  { id: 7, name: "dr. ANINDA", role: "shift", requestedLeaves: [], requestedExtraLeaves: [20, 21, 22], requestedAnnualLeaves: [] },
  { id: 8, name: "dr. GRACYA", role: "shift", requestedLeaves: [4, 5, 17, 18], requestedExtraLeaves: [6], requestedAnnualLeaves: [] },
  { id: 9, name: "dr. ANISA A", role: "shift", requestedLeaves: [21, 22], requestedExtraLeaves: [1, 2, 3, 4, 23, 24], requestedAnnualLeaves: [] },
  { id: 10, name: "NON_SHIFT_1", role: "non_shift", requestedLeaves: [], requestedExtraLeaves: [], requestedAnnualLeaves: [] },
]
