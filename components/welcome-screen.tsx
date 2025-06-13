"use client"

import { useState } from "react"
import { useBudget, suggestedEnvelopes } from "@/context/budget-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/budget-calculator"

export function WelcomeScreen() {
  const { startNewPeriod } = useBudget()
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [periodLength, setPeriodLength] = useState("14")
  const [plannedEnvelopes, setPlannedEnvelopes] = useState(() =>
    suggestedEnvelopes.map((env) => ({
      name: env.name,
      allocation: env.allocation,
      spent: 0,
      periodLength: Number.parseInt(periodLength),
    })),
  )

  const handleAddEnvelope = () => {
    setPlannedEnvelopes([
      ...plannedEnvelopes,
      {
        name: "",
        allocation: 0,
        spent: 0,
        periodLength: Number.parseInt(periodLength),
      },
    ])
  }

  const handleRemoveEnvelope = (index: number) => {
    setPlannedEnvelopes(plannedEnvelopes.filter((_, i) => i !== index))
  }

  const handleEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...plannedEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setPlannedEnvelopes(newEnvelopes)
  }

  const handleCreateBudget = () => {
    // Validate inputs
    if (plannedEnvelopes.some((env) => !env.name || env.allocation <= 0)) {
      alert("Please fill in all envelope names and allocations")
      return
    }

    const periodLengthNum = Number.parseInt(periodLength)
    if (isNaN(periodLengthNum) || periodLengthNum <= 0) {
      alert("Please enter a valid period length")
      return
    }

    // Start new period
    startNewPeriod(
      startDate,
      periodLengthNum,
      plannedEnvelopes.map((env) => ({
        ...env,
        periodLength: periodLengthNum,
      })),
    )
  }

  // Calculate total budget
  const totalBudget = plannedEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to Budget Enforcer!</CardTitle>
        <p className="text-muted-foreground mt-2">
          Let's set up your first budget. We've added some suggested envelopes to get you started.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
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
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period-length">Period Length (days)</Label>
            <Input
              id="period-length"
              type="number"
              value={periodLength}
              onChange={(e) => setPeriodLength(e.target.value)}
              min="1"
              max="31"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Your Envelopes</h3>
            <div className="text-sm font-medium">Total: {formatCurrency(totalBudget)}</div>
          </div>

          <div className="space-y-3">
            {plannedEnvelopes.map((envelope, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Envelope name"
                    value={envelope.name}
                    onChange={(e) => handleEnvelopeChange(index, "name", e.target.value)}
                  />
                </div>
                <div className="col-span-5">
                  <Input
                    type="number"
                    placeholder="Allocation"
                    value={envelope.allocation}
                    onChange={(e) => handleEnvelopeChange(index, "allocation", e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveEnvelope(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full mt-2" onClick={handleAddEnvelope}>
              <Plus className="h-4 w-4 mr-2" />
              Add Envelope
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleCreateBudget}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Create My Budget
        </Button>
      </CardFooter>
    </Card>
  )
}
