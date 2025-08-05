"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, BarChart3, List } from "lucide-react"
import type { Personnel, Schedule, PersonnelStats, Config } from "@/types"
import { getDaysInMonth, parseISO, format } from "date-fns"

interface ResultsSectionProps {
  personnel: Personnel[]
  schedule: Schedule
  stats: PersonnelStats[]
  config: Config
}

type ShiftType = "P" | "S" | "M"
type LeaveType = "L" | "LT" | "CT"

const shiftColors: Record<ShiftType, "default" | "destructive" | "outline" | "secondary"> = {
  P: "default",      // Blue for morning
  S: "secondary",    // Gray for afternoon  
  M: "destructive",  // Red for night
}

const leaveColors: Record<LeaveType, "outline"> = {
  L: "outline",   // Green outline for all leave types
  LT: "outline",
  CT: "outline",
}

export function ResultsSection({ personnel, schedule, stats, config }: ResultsSectionProps) {
  const [year, month] = config.month.split("-").map(Number)
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const scheduleDays = Object.keys(schedule)

  const getShiftForDay = (personId: number, date: string): { type: ShiftType | LeaveType; variant: any } | null => {
    const daySchedule = schedule[date]
    
    // Add safety checks for schedule structure
    if (!daySchedule || typeof daySchedule !== 'object') {
      return null
    }
    
    if (daySchedule.P && Array.isArray(daySchedule.P) && daySchedule.P.includes(personId)) return { type: "P", variant: shiftColors.P }
    if (daySchedule.S && Array.isArray(daySchedule.S) && daySchedule.S.includes(personId)) return { type: "S", variant: shiftColors.S }
    if (daySchedule.M && Array.isArray(daySchedule.M) && daySchedule.M.includes(personId)) return { type: "M", variant: shiftColors.M }

    const dayOfMonth = parseInt(date.split("-")[2], 10)
    const person = personnel.find((p) => p.id === personId)
    if (!person) return null

    // Keep different leave types but same green color
    if (person.requestedLeaves.includes(dayOfMonth)) return { type: "L", variant: leaveColors.L }
    if (person.requestedExtraLeaves.includes(dayOfMonth)) return { type: "LT", variant: leaveColors.LT }
    if (person.requestedAnnualLeaves.includes(dayOfMonth)) return { type: "CT", variant: leaveColors.CT }

    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Summary View
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-center">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3">Date</th>
                    {personnel.map((person) => (
                      <th key={person.id} className="border border-gray-300 p-3 min-w-[120px]">
                        {person.name}
                        <div className="text-xs text-gray-500 font-normal">({person.role})</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateObj = new Date(year, month - 1, day)
                    const dateString = format(dateObj, "yyyy-MM-dd")
                    const dayOfWeek = format(dateObj, "EEE")
                    const isWeekend = dayOfWeek === "Sat" || dayOfWeek === "Sun"

                    return (
                      <tr key={day} className={isWeekend ? "bg-blue-50" : ""}>
                        <td className="border border-gray-300 p-3 font-medium">
                          {day}
                          <div className="text-xs text-gray-500">{dayOfWeek}</div>
                        </td>
                        {personnel.map((person) => {
                          const shiftInfo = getShiftForDay(person.id, dateString)
                          return (
                            <td key={person.id} className="border border-gray-300 p-3">
                              {shiftInfo ? (
                                <Badge
                                  variant={shiftInfo.variant}
                                  className={["L", "LT", "CT"].includes(shiftInfo.type) ? "border-green-500 text-green-700 bg-green-50" : ""}
                                >
                                  {shiftInfo.type}
                                </Badge>
                              ) : (
                                <Badge
                                  variant={leaveColors.L}
                                  className={"border-green-500 text-green-700 bg-green-50"}
                                >
                                  L
                                </Badge>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default">P</Badge>
                <span>Morning (Pagi)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">S</Badge>
                <span>Afternoon (Sore)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">M</Badge>
                <span>Night (Malam)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">L</Badge>
                <span>Regular Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">LT</Badge>
                <span>Extra Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">CT</Badge>
                <span>Annual Leave</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="mt-8">
            <div className="space-y-6">
              {scheduleDays.filter(date => {
                // Filter out invalid dates
                try {
                  parseISO(date)
                  return true
                } catch {
                  return false
                }
              }).map((date) => {
                let dateObj: Date
                let dayOfWeek: string
                
                try {
                  dateObj = parseISO(date)
                  dayOfWeek = format(dateObj, "EEEE")
                } catch (error) {
                  console.error(`Invalid date: ${date}`, error)
                  return null
                }
                
                const daySchedule = schedule[date]
                
                // Add safety check for daySchedule
                if (!daySchedule || typeof daySchedule !== 'object') {
                  return null
                }
                
                const findPersonName = (id: number) => personnel.find((p) => p.id === id)?.name || `ID ${id}`

                return (
                  <div key={date} className="p-6 border rounded-lg">
                    <h3 className="font-semibold text-lg mb-4">
                      {format(dateObj, "MMMM d, yyyy")} ({dayOfWeek})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium text-blue-600 mb-2">Morning (P)</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {daySchedule.P && Array.isArray(daySchedule.P) && daySchedule.P.length > 0 ? (
                            daySchedule.P.map((id) => <li key={id}>• {findPersonName(id)}</li>)
                          ) : (
                            <li>-</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">Afternoon (S)</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {daySchedule.S && Array.isArray(daySchedule.S) && daySchedule.S.length > 0 ? (
                            daySchedule.S.map((id) => <li key={id}>• {findPersonName(id)}</li>)
                          ) : (
                            <li>-</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-purple-600 mb-2">Night (M)</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {daySchedule.M && Array.isArray(daySchedule.M) && daySchedule.M.length > 0 ? (
                            daySchedule.M.map((id) => <li key={id}>• {findPersonName(id)}</li>)
                          ) : (
                            <li>-</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{stat.name || `Person ${index + 1}`}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Morning (P):</span>
                      <span className="font-medium">{stat.totalMorning}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-600">Afternoon (S):</span>
                      <span className="font-medium">{stat.totalAfternoon}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-600">Night (M):</span>
                      <span className="font-medium">{stat.totalNight}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Regular Leave (L):</span>
                      <span className="font-medium">{stat.totalLeave}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Extra Leave (LT):</span>
                      <span className="font-medium">{stat.totalExtraLeave}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Leave (CT):</span>
                      <span className="font-medium">{stat.totalAnnualLeave}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}