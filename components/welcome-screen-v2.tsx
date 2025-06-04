"use client"

import { useState, useMemo } from "react"
import { useBudget } from "@/context/budget-context"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/utils/budget-calculator"

export function WelcomeScreenV2() {
  const { startNewPeriod } = useBudget()
  const { user } = useAuth()
  const [currentMoney, setCurrentMoney] = useState("")
  const [syncPeriodEnvelopes, setSyncPeriodEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])
  const [fullPeriodEnvelopes, setFullPeriodEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])
  const [activeTab, setActiveTab] = useState("sync")

  const preferences = user?.preferences

  // Calculate period dates - use useMemo to prevent recalculations on every render
  const periodDates = useMemo(() => {
    if (!preferences) return null

    // For sync period, we need to calculate the end date as the day before the next paycheck
    const syncPeriodStart = preferences.firstPeriodStart

    // Calculate sync period end as the day before the next paycheck
    const syncPeriodEnd = new Date(preferences.nextPayday)
    syncPeriodEnd.setDate(syncPeriodEnd.getDate() - 1)
    syncPeriodEnd.setHours(23, 59, 59, 999) // Set to end of day

    // For full period, start is the next paycheck date
    const fullPeriodStart = preferences.nextPayday

    // Calculate full period end based on paycheck frequency
    let fullPeriodEnd: Date

    if (preferences.paycheckFrequency === "monthly") {
      // For monthly, end on the day before next month's pay day
      fullPeriodEnd = new Date(fullPeriodStart)
      fullPeriodEnd.setMonth(fullPeriodStart.getMonth() + 1)
      fullPeriodEnd.setDate(fullPeriodStart.getDate() - 1)
    } else if (preferences.paycheckFrequency === "semimonthly" && preferences.semiMonthlyPayDays) {
      // For semi-monthly, end on the day before the next pay date
      fullPeriodEnd = new Date(fullPeriodStart)
      const [firstPayDay, secondPayDay] = preferences.semiMonthlyPayDays.sort((a, b) => a - b)
      const currentPayDay = fullPeriodStart.getDate()

      if (currentPayDay === firstPayDay) {
        // Next pay is the second pay day of the same month
        fullPeriodEnd.setDate(secondPayDay - 1)
      } else {
        // Next pay is the first pay day of the next month
        fullPeriodEnd.setMonth(fullPeriodStart.getMonth() + 1)
        fullPeriodEnd.setDate(firstPayDay - 1)
      }
    } else {
      // For weekly/biweekly, add the period length and subtract 1 day
      fullPeriodEnd = new Date(fullPeriodStart)
      fullPeriodEnd.setDate(fullPeriodStart.getDate() + preferences.periodLength - 1)
    }

    // Set to end of day
    fullPeriodEnd.setHours(23, 59, 59, 999)

    return {
      syncPeriodStart,
      syncPeriodEnd,
      fullPeriodStart,
      fullPeriodEnd,
    }
  }, [preferences])

  // Calculate totals - use useMemo to prevent recalculations on every render
  const budgetTotals = useMemo(() => {
    const availableMoney = Number.parseFloat(currentMoney) || 0
    const syncPeriodTotal = syncPeriodEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
    const fullPeriodTotal = fullPeriodEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

    return {
      availableMoney,
      syncPeriodTotal,
      fullPeriodTotal,
    }
  }, [currentMoney, syncPeriodEnvelopes, fullPeriodEnvelopes])

  // Calculate validation status - use useMemo to prevent recalculations on every render
  const validationStatus = useMemo(() => {
    if (!preferences) return { syncPeriodValid: false, fullPeriodValid: false }
    const syncPeriodValid =
      syncPeriodEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.syncPeriodTotal === budgetTotals.availableMoney &&
      budgetTotals.availableMoney > 0

    const fullPeriodValid =
      fullPeriodEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.fullPeriodTotal === preferences.paycheckAmount

    return {
      syncPeriodValid,
      fullPeriodValid,
    }
  }, [syncPeriodEnvelopes, fullPeriodEnvelopes, budgetTotals, preferences])

  const handleSyncEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...syncPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setSyncPeriodEnvelopes(newEnvelopes)
  }

  const handleFullEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...fullPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setFullPeriodEnvelopes(newEnvelopes)
  }

  const handleAddSyncEnvelope = () => {
    setSyncPeriodEnvelopes([...syncPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const handleAddFullEnvelope = () => {
    setFullPeriodEnvelopes([...fullPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const handleRemoveSyncEnvelope = (index: number) => {
    setSyncPeriodEnvelopes(syncPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const handleRemoveFullEnvelope = (index: number) => {
    setFullPeriodEnvelopes(fullPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const handleCreateBudget = () => {
    // Validate inputs
    if (!currentMoney || budgetTotals.availableMoney <= 0) {
      alert("Please enter how much money you have available for this period")
      return
    }

    if (syncPeriodEnvelopes.some((env) => !env.name || env.allocation < 0)) {
      alert("Please fill in all sync period envelope names and allocations")
      return
    }

    if (fullPeriodEnvelopes.some((env) => !env.name || env.allocation < 0)) {
      alert("Please fill in all full period envelope names and allocations")
      return
    }

    if (budgetTotals.syncPeriodTotal !== budgetTotals.availableMoney) {
      alert(
        `Your sync period budget (${formatCurrency(budgetTotals.syncPeriodTotal)}) must equal your available money (${formatCurrency(budgetTotals.availableMoney)}). Please allocate all funds to envelopes.`,
      )
      return
    }

    if (budgetTotals.fullPeriodTotal !== preferences?.paycheckAmount) {
      alert(
        `Your full period budget (${formatCurrency(budgetTotals.fullPeriodTotal)}) must equal your paycheck amount (${formatCurrency(preferences?.paycheckAmount)}). Please allocate all funds to envelopes.`,
      )
      return
    }

    // Additional validation: ensure both budgets have at least one envelope with allocation > 0
    if (budgetTotals.syncPeriodTotal === 0) {
      alert("Please allocate money to at least one envelope in your sync period budget")
      return
    }

    if (budgetTotals.fullPeriodTotal === 0) {
      alert("Please allocate money to at least one envelope in your full period budget")
      return
    }

    console.log("Period dates being used:", {
      syncPeriodStart: periodDates?.syncPeriodStart,
      syncPeriodEnd: periodDates?.syncPeriodEnd,
      fullPeriodStart: periodDates?.fullPeriodStart,
      fullPeriodEnd: periodDates?.fullPeriodEnd,
      firstPeriodLength: preferences?.firstPeriodLength,
      nextPayday: preferences?.nextPayday,
    })

    // Start with the sync period
    startNewPeriod(
      periodDates?.syncPeriodStart,
      preferences?.firstPeriodLength,
      syncPeriodEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.firstPeriodLength,
      })),
      periodDates?.syncPeriodEnd,
    )

    // Save the full period plan for when the sync period ends
    const fullPeriodPlan = {
      envelopes: fullPeriodEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.periodLength,
      })),
      savedAt: new Date().toISOString(),
    }

    // Save the full period plan to localStorage so it can be used when the sync period ends
    const userId = user?.id || "guest"
    const fullPeriodId = `period_${periodDates?.fullPeriodStart?.getTime()}`
    const savedPlansJson = localStorage.getItem(`budget_enforcer_period_plans_${userId}`)
    const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

    savedPlans[fullPeriodId] = fullPeriodPlan
    localStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
  }

  if (!preferences) return null

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to Budget Enforcer!</CardTitle>
        <p className="text-muted-foreground mt-2">
          Let's set up your budget periods. You'll create budgets for both your sync period and your first full period.
          Use the "Saving & Investing" envelope for any remaining funds.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sync Period</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {format(periodDates.syncPeriodStart, "MMM d")} - {format(periodDates.syncPeriodEnd, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {preferences.firstPeriodLength} days to sync with your paycheck
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">First Full Period</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {format(periodDates.fullPeriodStart, "MMM d")} - {format(periodDates.fullPeriodEnd, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {preferences.periodLength} days • {formatCurrency(preferences.paycheckAmount)} paycheck
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Available Money Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="current-money">
                How much money do you have available to spend during the sync period?
              </Label>
              <Input
                id="current-money"
                type="number"
                value={currentMoney}
                onChange={(e) => setCurrentMoney(e.target.value)}
                placeholder="e.g., 500"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                This is the money you have right now that needs to last until your next paycheck.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Setup Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="sync"
              className={!validationStatus.syncPeriodValid && budgetTotals.availableMoney > 0 ? "text-red-600" : ""}
            >
              Sync Period Budget
              {budgetTotals.syncPeriodTotal > 0 && (
                <span className="ml-2 text-xs">({formatCurrency(budgetTotals.syncPeriodTotal)})</span>
              )}
              {validationStatus.syncPeriodValid && <span className="ml-1 text-green-600">✓</span>}
            </TabsTrigger>
            <TabsTrigger value="full" className={!validationStatus.fullPeriodValid ? "text-red-600" : ""}>
              Full Period Budget
              {budgetTotals.fullPeriodTotal > 0 && (
                <span className="ml-2 text-xs">({formatCurrency(budgetTotals.fullPeriodTotal)})</span>
              )}
              {validationStatus.fullPeriodValid && <span className="ml-1 text-green-600">✓</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Sync Period Envelopes</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(budgetTotals.syncPeriodTotal)} of {formatCurrency(budgetTotals.availableMoney)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {budgetTotals.syncPeriodTotal === budgetTotals.availableMoney && budgetTotals.availableMoney > 0
                        ? "Fully allocated"
                        : budgetTotals.availableMoney > 0
                          ? `${formatCurrency(Math.abs(budgetTotals.availableMoney - budgetTotals.syncPeriodTotal))} ${budgetTotals.syncPeriodTotal > budgetTotals.availableMoney ? "over budget" : "remaining"}`
                          : "Enter available money above"}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syncPeriodEnvelopes.map((envelope, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <Input
                          placeholder="Envelope name"
                          value={envelope.name}
                          onChange={(e) => handleSyncEnvelopeChange(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={envelope.allocation}
                          onChange={(e) => handleSyncEnvelopeChange(index, "allocation", e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSyncEnvelope(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full mt-2" onClick={handleAddSyncEnvelope}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Envelope
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="full" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Full Period Envelopes</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrency(budgetTotals.fullPeriodTotal)} of {formatCurrency(preferences.paycheckAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {budgetTotals.fullPeriodTotal === preferences.paycheckAmount
                        ? "Fully allocated"
                        : `${formatCurrency(Math.abs(preferences.paycheckAmount - budgetTotals.fullPeriodTotal))} ${budgetTotals.fullPeriodTotal > preferences.paycheckAmount ? "over budget" : "remaining"}`}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fullPeriodEnvelopes.map((envelope, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <Input
                          placeholder="Envelope name"
                          value={envelope.name}
                          onChange={(e) => handleFullEnvelopeChange(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={envelope.allocation}
                          onChange={(e) => handleFullEnvelopeChange(index, "allocation", e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFullEnvelope(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full mt-2" onClick={handleAddFullEnvelope}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Envelope
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleCreateBudget}
          disabled={
            !currentMoney ||
            budgetTotals.availableMoney <= 0 ||
            !validationStatus.syncPeriodValid ||
            !validationStatus.fullPeriodValid
          }
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Create My Budget
        </Button>
      </CardFooter>
    </Card>
  )
}
