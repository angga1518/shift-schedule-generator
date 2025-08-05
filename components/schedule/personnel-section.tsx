"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, X } from "lucide-react"
import { NumberChipInput } from "@/components/ui/number-chip-input"
import type { Personnel } from "@/types"

interface PersonnelSectionProps {
  personnel: Personnel[]
  onAddPersonnel: () => void
  onRemovePersonnel: (id: number) => void
  onUpdatePersonnel: (id: number, field: keyof Personnel, value: any) => void
}

export function PersonnelSection({
  personnel,
  onAddPersonnel,
  onRemovePersonnel,
  onUpdatePersonnel,
}: PersonnelSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Personnel Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {personnel.map((person) => (
            <div key={person.id} className="relative p-6 border rounded-lg bg-white space-y-6">
              {/* Remove Button - Top Right */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemovePersonnel(person.id)}
                disabled={personnel.length === 1}
                className="absolute top-4 right-4 h-8 w-8 p-0"
                suppressHydrationWarning
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Basic Info Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-12">
                <div className="space-y-3">
                  <Label>Name</Label>
                  <Input
                    value={person.name}
                    onChange={(e) => onUpdatePersonnel(person.id, "name", e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Role</Label>
                  <Select value={person.role} onValueChange={(value) => onUpdatePersonnel(person.id, "role", value)}>
                    <SelectTrigger suppressHydrationWarning>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent suppressHydrationWarning>
                      <SelectItem value="shift">Shift</SelectItem>
                      <SelectItem value="non_shift">Non-Shift</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Leave Requests Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label>Regular Leaves (L)</Label>
                  <NumberChipInput
                    value={person.requestedLeaves}
                    onChange={(value) => onUpdatePersonnel(person.id, "requestedLeaves", value)}
                    placeholder="Type day and press space (e.g., 5)"
                    maxValue={31}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Extra Leaves (LT)</Label>
                  <NumberChipInput
                    value={person.requestedExtraLeaves}
                    onChange={(value) => onUpdatePersonnel(person.id, "requestedExtraLeaves", value)}
                    placeholder="Type day and press space (e.g., 20)"
                    maxValue={31}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Annual Leaves (CT)</Label>
                  <NumberChipInput
                    value={person.requestedAnnualLeaves}
                    onChange={(value) => onUpdatePersonnel(person.id, "requestedAnnualLeaves", value)}
                    placeholder="Type day and press space (e.g., 29)"
                    maxValue={31}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button 
            onClick={onAddPersonnel} 
            variant="outline" 
            size="lg" 
            className="w-full md:w-auto bg-transparent"
            suppressHydrationWarning
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Personnel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
