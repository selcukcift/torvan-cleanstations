"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DatePickerSimple({
  date,
  onDateChange,
  placeholder = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
}: DatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  // Convert Date to YYYY-MM-DD format for input value
  const dateValue = date ? format(date, 'yyyy-MM-dd') : ''
  
  // Format dates for min/max attributes
  const minDateValue = minDate ? format(minDate, 'yyyy-MM-dd') : undefined
  const maxDateValue = maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value) {
      const newDate = new Date(value)
      // Adjust for timezone to prevent date shifting
      newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset())
      onDateChange?.(newDate)
    } else {
      onDateChange?.(undefined)
    }
  }
  
  const handleIconClick = () => {
    inputRef.current?.showPicker()
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          value={dateValue}
          onChange={handleChange}
          min={minDateValue}
          max={maxDateValue}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
            !date && "text-muted-foreground"
          )}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleIconClick}
          disabled={disabled}
          className={cn(
            "absolute right-0 top-0 h-10 px-3 py-2 hover:bg-transparent",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      {date && (
        <div className="mt-1 text-xs text-muted-foreground">
          {format(date, 'PPP')}
        </div>
      )}
    </div>
  )
}