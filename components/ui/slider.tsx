/**
 * Simple Slider Component
 * Basic implementation for PDF navigation
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
  className?: string
}

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step,
  className
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value)
    onValueChange([newValue])
  }

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={cn(
        "h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer",
        "slider-thumb:appearance-none slider-thumb:h-4 slider-thumb:w-4",
        "slider-thumb:bg-blue-500 slider-thumb:rounded-full slider-thumb:cursor-pointer",
        className
      )}
    />
  )
}