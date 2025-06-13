"use client"

import { useState, useEffect } from "react"
import { useBudget } from "@/context/budget-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plus, Trash2, Save } from "lucide-react"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/budget-calculator"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function PeriodPlanner() {
  const { envelopes, currentPeriod, periods } = useBudget()

  // Calculate next period start date (day after current period ends)
  const calculateNextPeriodStart = () => {
    if (currentPeriod) {
      return addDays(currentPeriod.endDate, 1)
    }
    // If no current period, start from today
    return new Date()
  }

  const [startDate, setStartDate] = useState<Date>(calculateNextPeriodStart())
  const [periodLength, setPeriodLength] = useState("14")
  const [plannedEnvelopes, setPlannedEnvelopes] = useState(() =>
    envelopes.map((env) => ({
      name: env.name,
      allocation: env.allocation,
      spent: 0,
      periodLength: env.periodLength,
    })),
  )
  const [savedPlans, setSavedPlans] = useState<
    Array<{
      id: string
      name: string
      startDate: Date
      periodLength: number
      envelopes: any[]
    }>
  >([])
  const [planName, setPlanName] = useState(`Plan for ${format(startDate, "MMM d, yyyy")}`)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Update planned envelopes when current envelopes change
  useEffect(() => {
    if (envelopes.length > 0) {
      setPlannedEnvelopes(
        envelopes.map((env) => ({
          name: env.name,
          allocation: env.allocation,
          spent: 0,
          periodLength: env.periodLength,
        })),
      )
    }
  }, [envelopes])

  // Load saved plans from localStorage
  useEffect(() => {
    const loadSavedPlans = () => {
      const savedPlansJson = localStorage.getItem("budget_enforcer_saved_plans")
      if (savedPlansJson) {
        try {
          const plans = JSON.parse(savedPlansJson)
          setSavedPlans(
            plans.map((plan: any) => ({
              ...plan,
              startDate: new Date(plan.startDate),
            })),
          )
        } catch (error) {
          console.error("Failed to load saved plans:", error)
        }
      }
    }

    loadSavedPlans()
  }, [])

  // Save plans to localStorage when they change
  useEffect(() => {
    localStorage.setItem("budget_enforcer_saved_plans", JSON.stringify(savedPlans))
  }, [savedPlans])

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

  const handleSavePlan = () => {
    // Validate inputs
    if (plannedEnvelopes.some((env) => !env.name || env.allocation <= 0)) {
      setSaveMessage("Please fill in all envelope names and allocations")
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    const periodLengthNum = Number.parseInt(periodLength)
    if (isNaN(periodLengthNum) || periodLengthNum <= 0) {
      setSaveMessage("Please enter a valid period length")
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Create new plan
    const newPlan = {
      id: `plan_${Date.now()}`,
      name: planName,
      startDate,
      periodLength: periodLengthNum,
      envelopes: plannedEnvelopes.map((env) => ({
        ...env,
        periodLength: periodLengthNum,
      })),
    }

    // Add to saved plans
    setSavedPlans([...savedPlans, newPlan])

    // Show success message
    setSaveMessage("Plan saved successfully!")
    setTimeout(() => setSaveMessage(null), 3000)
  }

  // Calculate total budget
  const totalBudget = plannedEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Future Budget Period</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {saveMessage && (
          <Alert variant={saveMessage.includes("successfully") ? "default" : "destructive"} className="mb-4">
            <AlertDescription>{saveMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Enter a name for this plan"
            />
          </div>

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
                  onSelect={(date) => {
                    if (date) {
                      // Ensure we get the correct date in local timezone
                      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                      setStartDate(localDate)
                      setPlanName(`Plan for ${format(localDate, "MMM d, yyyy")}`)
                    }
                  }}
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
            <h3 className="font-medium">Planned Envelopes</h3>
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

        {savedPlans.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">Saved Plans</h3>
            <div className="space-y-2">
              {savedPlans.map((plan) => (
                <div key={plan.id} className="flex justify-between items-center border p-3 rounded-md">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(plan.startDate, "MMM d, yyyy")} ({plan.periodLength} days)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStartDate(plan.startDate)
                        setPeriodLength(plan.periodLength.toString())
                        setPlannedEnvelopes(plan.envelopes)
                        setPlanName(plan.name)
                      }}
                    >
                      Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSavePlan}>
          <Save className="h-4 w-4 mr-2" />
          Save Budget Plan
        </Button>
      </CardFooter>
    </Card>
  )
}
