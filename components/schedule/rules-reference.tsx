"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function RulesReference() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling Rules Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Daily Staffing Requirements</h3>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>
                <strong>Weekdays:</strong> P=1, S=2, M=2
              </li>
              <li>
                <strong>Weekends/Holidays:</strong> P=2, S=2, M=3
              </li>
              <li>
                <strong>Special Dates:</strong> Custom overrides
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Shift Sequence Rules</h3>
            <ul className="text-sm space-y-2 text-gray-600">
              <li>After Night (M) → Night (M) or Leave (L)</li>
              <li>After Afternoon (S) → S, M, or L</li>
              <li>After Morning (P) → P, S, M, or L</li>
              <li>Max 2 consecutive nights, then 2 leave days</li>
              <li>Max 5 consecutive workdays</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
