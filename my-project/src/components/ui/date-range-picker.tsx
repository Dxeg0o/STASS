"use client"

import * as React from "react"
import { CalendarIcon, ArrowRightIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: DateRange | undefined
  onChange?: (range: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  value,
  onChange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    value ?? {
      from: new Date(),
      to: new Date(),
    }
  )

  React.useEffect(() => {
    if (value) {
      setDate(value)
    }
  }, [value])

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) return
    setDate(range)
    if (range.from && !range.to) {
      setActiveField("to")
      setOpen(true)
    } else if (range.from && range.to) {
      if (range.to < range.from) {
        setError("La fecha de término no puede ser anterior a la de inicio")
      } else {
        setError("")
        setOpen(false)
        onChange?.(range)
      }
    }
  }

  const [activeField, setActiveField] = React.useState<"from" | "to">("from")
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState("")

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex items-end gap-2">
          <div className="flex flex-col flex-1">
            <label htmlFor="start-date" className="text-sm">Inicio</label>
            <PopoverTrigger asChild>
              <Input
                id="start-date"
                aria-label="Fecha de inicio"
                readOnly
                value={date?.from ? format(date.from, "yyyy-MM-dd") : ""}
                placeholder="Inicio"
                onFocus={() => {
                  setActiveField("from")
                  setOpen(true)
                }}
                className={cn(activeField === "from" && open && "ring-2 ring-primary")}
              />
            </PopoverTrigger>
          </div>
          <ArrowRightIcon className="mb-2" />
          <div className="flex flex-col flex-1">
            <label htmlFor="end-date" className="text-sm">Fin</label>
            <PopoverTrigger asChild>
              <Input
                id="end-date"
                aria-label="Fecha de término"
                readOnly
                value={date?.to ? format(date.to, "yyyy-MM-dd") : ""}
                placeholder="Fin"
                onFocus={() => {
                  setActiveField("to")
                  setOpen(true)
                }}
                className={cn(activeField === "to" && open && "ring-2 ring-primary")}
              />
            </PopoverTrigger>
          </div>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          {error && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

