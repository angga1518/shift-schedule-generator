import type { Personnel, PersonnelStats, Schedule } from "@/types"

export function calculateStats(personnel: Personnel[], schedule: Schedule): PersonnelStats[] {
  const stats: PersonnelStats[] = personnel.map((person) => ({
    name: person.name,
    totalMorning: 0,
    totalAfternoon: 0,
    totalNight: 0,
    totalLeave: 0,
    totalExtraLeave: 0,
    totalAnnualLeave: 0,
  }))

  // Handle empty schedule
  if (!schedule || Object.keys(schedule).length === 0) {
    return stats
  }

  for (const date in schedule) {
    const daySchedule = schedule[date]
    
    // Skip if daySchedule is undefined or not an object
    if (!daySchedule || typeof daySchedule !== 'object') {
      continue
    }

    for (const person of personnel) {
      const stat = stats.find((s) => s.name === person.name)
      if (!stat) continue

      // Check if this person has an assignment for this day
      // The schedule format is: { "2024-01-01": { P: [1, 2], S: [3, 4], M: [5] } }
      if (daySchedule.P && Array.isArray(daySchedule.P) && daySchedule.P.includes(person.id)) {
        stat.totalMorning++
      } else if (daySchedule.S && Array.isArray(daySchedule.S) && daySchedule.S.includes(person.id)) {
        stat.totalAfternoon++
      } else if (daySchedule.M && Array.isArray(daySchedule.M) && daySchedule.M.includes(person.id)) {
        stat.totalNight++
      } else {
        // Check for leaves by looking at requested leaves, as the generated schedule only contains shifts
        const dayOfMonth = parseInt(date.split("-")[2], 10)
        if (person.requestedLeaves.includes(dayOfMonth)) {
          stat.totalLeave++
        } else if (person.requestedExtraLeaves.includes(dayOfMonth)) {
          stat.totalExtraLeave++
        } else if (person.requestedAnnualLeaves.includes(dayOfMonth)) {
          stat.totalAnnualLeave++
        }
      }
    }
  }

  return stats
}