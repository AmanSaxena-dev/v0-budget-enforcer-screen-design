"use client"

import { useState, useEffect, useMemo } from "react"
import { useBudget } from "@/context/budgetContext"
import { useAuth } from "@/context/authContext"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Save, Check, X, Settings } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/utils/budget-calculator"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function PeriodPlannerV2() {
  const { envelopes, getNextPeriods, savePeriodPlan, getPeriodPlan, deletePeriodPlan } = useBudget()
  const { user } = useAuth()
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [plannedEnvelopes, setPlannedEnvelopes] = useState<
    Array<{
      name: string
      allocation: number
      spent: number
      periodLength: number
    }>
  >([])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Use useMemo to prevent recalculations on every render
  const nextPeriods = useMemo(() => getNextPeriods(), [getNextPeriods])

  // Set initial selected period only once when component mounts
  useEffect(() => {
    if (nextPeriods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(nextPeriods[0].id)
    }
  }, [nextPeriods, selectedPeriodId])

  // Get the selected period using useMemo
  const selectedPeriod = useMemo(() => {
    return nextPeriods.find((p) => p.id === selectedPeriodId)
  }, [nextPeriods, selectedPeriodId])

  // Load plan when period is selected
  useEffect(() => {
    if (selectedPeriodId && selectedPeriod) {
      if (selectedPeriod.isCurrent) {
        // For current period, use the actual envelopes
        setPlannedEnvelopes(
          envelopes.map((env) => ({
            name: env.name,
            allocation: env.allocation,
            spent: env.spent,
            periodLength: env.periodLength,
          })),
        )
      } else {
        const existingPlan = getPeriodPlan(selectedPeriodId)
        if (existingPlan) {
          setPlannedEnvelopes(existingPlan)
        } else {
          // Initialize with current envelopes as template
          setPlannedEnvelopes(
            envelopes.map((env) => ({
              name: env.name,
              allocation: env.allocation,
              spent: 0,
              periodLength: selectedPeriod?.periodLength || 14,
            })),
          )
        }
      }
    }
  }, [selectedPeriodId, envelopes, getPeriodPlan, selectedPeriod])

  const handleAddEnvelope = () => {
    setPlannedEnvelopes([
      ...plannedEnvelopes,
      {
        name: "",
        allocation: 0,
        spent: 0,
        periodLength: selectedPeriod?.periodLength || 14,
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
    if (!selectedPeriodId || selectedPeriod?.isCurrent) return

    // Validate inputs
    if (plannedEnvelopes.some((env) => !env.name || env.allocation <= 0)) {
      setSaveMessage("Please fill in all envelope names and allocations")
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Save the plan
    savePeriodPlan(selectedPeriodId, plannedEnvelopes)

    // Show success message
    setSaveMessage("Plan saved successfully!")
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleDeletePlan = () => {
    if (!selectedPeriodId || selectedPeriod?.isCurrent) return

    deletePeriodPlan(selectedPeriodId)

    // Reset to template
    setPlannedEnvelopes(
      envelopes.map((env) => ({
        name: env.name,
        allocation: env.allocation,
        spent: 0,
        periodLength: selectedPeriod?.periodLength || 14,
      })),
    )

    setSaveMessage("Plan deleted")
    setTimeout(() => setSaveMessage(null), 3000)
  }

  // Calculate total budget using useMemo
  const totalBudget = useMemo(() => {
    return plannedEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
  }, [plannedEnvelopes])

  if (!user?.preferences) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please complete your initial setup to access period planning.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Plan Future Budget Periods
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Period Settings
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your budget periods are based on your {user.preferences.paycheckFrequency} paycheck schedule
            {user.preferences.paycheckFrequency === "monthly" &&
              ` (${format(user.preferences.nextPayday, "do")} of each month)`}
            {user.preferences.paycheckFrequency === "semimonthly" &&
              user.preferences.semiMonthlyPayDays &&
              ` (${user.preferences.semiMonthlyPayDays[0]}${getOrdinalSuffix(user.preferences.semiMonthlyPayDays[0])} and ${user.preferences.semiMonthlyPayDays[1]}${getOrdinalSuffix(user.preferences.semiMonthlyPayDays[1])} of each month)`}
            . Plan your envelope allocations for the next periods.
          </p>

          <Tabs value={selectedPeriodId || ""} onValueChange={setSelectedPeriodId}>
            <TabsList className="grid w-full grid-cols-3">
              {nextPeriods.map((period, index) => (
                <TabsTrigger key={period.id} value={period.id} className="relative">
                  <div className="text-center">
                    <div className="font-medium">
                      {period.isCurrent ? "Current Period" : index === 1 ? "Next Period" : `Period ${index}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(period.startDate, "MMM d")} - {format(period.endDate, "MMM d")}
                    </div>
                    {period.isPlanned && !period.isCurrent && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {nextPeriods.map((period, index) => (
              <TabsContent key={period.id} value={period.id} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg">
                          {format(period.startDate, "MMMM d, yyyy")} - {format(period.endDate, "MMMM d, yyyy")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {period.periodLength} day period
                          {period.isCurrent && " (Currently Active)"}
                          {user.preferences?.paycheckFrequency === "monthly" && " • Monthly paycheck"}
                          {user.preferences?.paycheckFrequency === "semimonthly" && " • Semi-monthly paycheck"}
                          {user.preferences?.paycheckFrequency === "weekly" && " • Weekly paycheck"}
                          {user.preferences?.paycheckFrequency === "biweekly" && " • Bi-weekly paycheck"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Total Budget</div>
                        <div className="text-lg font-bold">{formatCurrency(totalBudget)}</div>
                        {!period.isCurrent && (
                          <div className="text-xs text-muted-foreground">
                            Target: {formatCurrency(user.preferences.paycheckAmount)}
                          </div>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {saveMessage && (
                      <Alert
                        variant={saveMessage.includes("successfully") ? "default" : "destructive"}
                        className="mb-4"
                      >
                        <AlertDescription>{saveMessage}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{period.isCurrent ? "Current Envelopes" : "Planned Envelopes"}</h4>
                        {period.isPlanned && !period.isCurrent && (
                          <div className="flex items-center text-sm text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            Plan Saved
                          </div>
                        )}
                      </div>

                      {plannedEnvelopes.map((envelope, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <Input
                              placeholder="Envelope name"
                              value={envelope.name}
                              onChange={(e) => handleEnvelopeChange(index, "name", e.target.value)}
                              disabled={period.isCurrent}
                            />
                          </div>
                          <div className="col-span-4">
                            <Input
                              type="number"
                              placeholder="Allocation"
                              value={envelope.allocation}
                              onChange={(e) => handleEnvelopeChange(index, "allocation", e.target.value)}
                              min="0"
                              step="0.01"
                              disabled={period.isCurrent}
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            {!period.isCurrent && (
                              <Button onClick={() => handleRemoveEnvelope(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      {!period.isCurrent && (
                        <Button className="w-full mt-2" onClick={handleAddEnvelope}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Envelope
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {!period.isCurrent && (
                    <CardFooter className="flex justify-between">
                      {period.isPlanned && (
                        <Button onClick={handleDeletePlan}>
                          <X className="h-4 w-4 mr-2" />
                          Delete Plan
                        </Button>
                      )}
                      <Button onClick={handleSavePlan} className="ml-auto">
                        <Save className="h-4 w-4 mr-2" />
                        Save Plan
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return "st"
  }
  if (j === 2 && k !== 12) {
    return "nd"
  }
  if (j === 3 && k !== 13) {
    return "rd"
  }
  return "th"
}
