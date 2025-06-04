"use client"

import type React from "react"

import { useState } from "react"
import { useBudget } from "@/context/budget-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface NewEnvelopeFormProps {
  onComplete: () => void
}

export function NewEnvelopeForm({ onComplete }: NewEnvelopeFormProps) {
  const { addEnvelope } = useBudget()
  const [name, setName] = useState("")
  const [allocation, setAllocation] = useState("")
  const [periodLength, setPeriodLength] = useState("14")
  const [startDate, setStartDate] = useState<Date>(new Date())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (name && allocation && periodLength) {
      addEnvelope({
        name,
        allocation: Number.parseFloat(allocation),
        periodLength: Number.parseInt(periodLength),
        startDate,
        spent: 0,
      })

      onComplete()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Envelope Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Food, Entertainment"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="allocation">Allocation Amount ($)</Label>
        <Input
          id="allocation"
          type="number"
          value={allocation}
          onChange={(e) => setAllocation(e.target.value)}
          placeholder="e.g., 420"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="periodLength">Period Length (days)</Label>
        <Input
          id="periodLength"
          type="number"
          value={periodLength}
          onChange={(e) => setPeriodLength(e.target.value)}
          placeholder="e.g., 14"
          min="1"
          max="31"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                if (date) {
                  // Ensure we get the correct date in local timezone
                  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                  setStartDate(localDate)
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={onComplete}>
          Cancel
        </Button>
        <Button type="submit">Create Envelope</Button>
      </div>
    </form>
  )
}
