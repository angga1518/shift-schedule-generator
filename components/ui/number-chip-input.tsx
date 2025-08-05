"use client"

import type React from "react"
import { useState, useEffect, type KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { NumberChipInputProps } from "@/types"

export function NumberChipInput({ value, onChange, placeholder, className, maxValue }: NumberChipInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [isMounted, setIsMounted] = useState(false)

  // Ensure hydration safety - only enable interactivity after mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isMounted) return // Prevent actions during hydration
    
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      const numValue = Number.parseInt(inputValue.trim())
      if (!isNaN(numValue) && numValue > 0 && !value.includes(numValue)) {
        // Add maxValue validation
        if (maxValue && numValue > maxValue) {
          // Don't add the value, just clear input
          setInputValue("")
          return
        }
        onChange([...value, numValue])
        setInputValue("")
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isMounted) return // Prevent actions during hydration
    
    const val = e.target.value
    // Only allow numbers and check maxValue
    if (val === "" || /^\d+$/.test(val)) {
      const numVal = Number.parseInt(val)
      if (maxValue && !isNaN(numVal) && numVal > maxValue) {
        return // Don't update if exceeds maxValue
      }
      setInputValue(val)
    }
  }

  const removeChip = (chipToRemove: number) => {
    if (!isMounted) return // Prevent actions during hydration
    onChange(value.filter((chip) => chip !== chipToRemove))
  }

  // Always render the same structure - just disable interactions until mounted
  return (
    <div
      className={`min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className || ""}`}
      suppressHydrationWarning
    >
      <div className="flex flex-wrap gap-1 items-center">
        {value.map((chip) => (
          <Badge key={chip} variant="secondary" className="flex items-center gap-1">
            {chip}
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              disabled={!isMounted}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={isMounted ? inputValue : ""}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none placeholder:text-muted-foreground"
          readOnly={!isMounted}
        />
      </div>
    </div>
  )
}
