"use client"

import { useState, type KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { ChipInputProps } from "@/types"

export function ChipInput({ value, onChange, placeholder, className }: ChipInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      const trimmedValue = inputValue.trim()
      if (trimmedValue && !value.includes(trimmedValue)) {
        onChange([...value, trimmedValue])
        setInputValue("")
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeChip = (chipToRemove: string) => {
    onChange(value.filter((chip) => chip !== chipToRemove))
  }

  return (
    <div
      className={`min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${className}`}
    >
      <div className="flex flex-wrap gap-1 items-center">
        {value.map((chip) => (
          <Badge key={chip} variant="secondary" className="flex items-center gap-1">
            {chip}
            <button
              type="button"
              onClick={() => removeChip(chip)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}
