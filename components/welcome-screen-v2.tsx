"use client"

import { useState, useMemo, useEffect } from "react"
import { useBudget } from "@/context/budget-context"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, ArrowRight, ArrowLeft, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/utils/budget-calculator"
import { Progress } from "@/components/ui/progress"
import type { Bill } from "@/types/budget"

export function WelcomeScreenV2() {
  const { startNewPeriod } = useBudget()
  const { user } = useAuth()

  // Setup steps
  const [setupStep, setSetupStep] = useState("bills") // "bills" -> "regular-budget" -> "sync-budget"

  // Bills setup state
  const [bills, setBills] = useState<Omit<Bill, "id" | "lastPaidDate">[]>([
    { name: "Rent/Mortgage", amount: 0, dueDay: 1, isRecurring: true, category: "housing" },
  ])

  // Regular period state (normal steady state)
  const [regularBillsAllocation, setRegularBillsAllocation] = useState<number | null>(null)
  const [regularEnvelopes, setRegularEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])

  // Sync period state (transition period)
  const [currentMoney, setCurrentMoney] = useState("")
  const [syncBillsAllocation, setSyncBillsAllocation] = useState<number | null>(null)
  const [syncEnvelopes, setSyncEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])

  const preferences = user?.preferences

  // Calculate period dates
  const periodDates = useMemo(() => {
    if (!preferences) return null

    // For sync period, we need to calculate the end date as the day before the next paycheck
    const syncPeriodStart = preferences.firstPeriodStart

    // Calculate sync period end as the day before the next paycheck
    const syncPeriodEnd = new Date(preferences.nextPayday)
    syncPeriodEnd.setDate(syncPeriodEnd.getDate() - 1)
    syncPeriodEnd.setHours(23, 59, 59, 999) // Set to end of day

    // For regular period, start is the next paycheck date
    const regularPeriodStart = preferences.nextPayday

    // Calculate regular period end based on paycheck frequency
    let regularPeriodEnd: Date

    if (preferences.paycheckFrequency === "monthly") {
      // For monthly, end on the day before next month's pay day
      regularPeriodEnd = new Date(regularPeriodStart)
      regularPeriodEnd.setMonth(regularPeriodStart.getMonth() + 1)
      regularPeriodEnd.setDate(regularPeriodStart.getDate() - 1)
    } else if (preferences.paycheckFrequency === "semimonthly" && preferences.semiMonthlyPayDays) {
      // For semi-monthly, end on the day before the next pay date
      regularPeriodEnd = new Date(regularPeriodStart)
      const [firstPayDay, secondPayDay] = preferences.semiMonthlyPayDays.sort((a, b) => a - b)
      const currentPayDay = regularPeriodStart.getDate()

      if (currentPayDay === firstPayDay) {
        // Next pay is the second pay day of the same month
        regularPeriodEnd.setDate(secondPayDay - 1)
      } else {
        // Next pay is the first pay day of the next month
        regularPeriodEnd.setMonth(regularPeriodStart.getMonth() + 1)
        regularPeriodEnd.setDate(firstPayDay - 1)
      }
    } else {
      // For weekly/biweekly, add the period length and subtract 1 day
      regularPeriodEnd = new Date(regularPeriodStart)
      regularPeriodEnd.setDate(regularPeriodStart.getDate() + preferences.periodLength - 1)
    }

    // Set to end of day
    regularPeriodEnd.setHours(23, 59, 59, 999)

    return {
      syncPeriodStart,
      syncPeriodEnd,
      regularPeriodStart,
      regularPeriodEnd,
    }
  }, [preferences])

  // Calculate budget totals
  const budgetTotals = useMemo(() => {
    const availableMoney = Number.parseFloat(currentMoney) || 0
    const totalMonthlyBills = bills.reduce((sum, bill) => sum + bill.amount, 0)
    const cushionAmount = totalMonthlyBills * 0.15 // 15% cushion
    const billsTargetAmount = totalMonthlyBills + cushionAmount

    // Regular period calculations
    const regularEnvelopesTotal = regularEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
    const regularTotal = regularEnvelopesTotal + (regularBillsAllocation || 0)

    // Sync period calculations
    const syncEnvelopesTotal = syncEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
    const syncTotal = syncEnvelopesTotal + (syncBillsAllocation || 0)

    // Calculate how much will be added to bills envelope per month
    let monthlyBillsFunding = 0
    if (preferences) {
      // Calculate how many regular periods per month
      const periodsPerMonth =
        {
          weekly: 4.33,
          biweekly: 2.17,
          semimonthly: 2,
          monthly: 1,
        }[preferences.paycheckFrequency] || 2

      // Monthly funding = regular period allocation × periods per month
      monthlyBillsFunding = (regularBillsAllocation || 0) * periodsPerMonth
    }

    // Calculate how much money is available for discretionary spending in regular periods
    const regularDiscretionaryFunds = preferences ? preferences.paycheckAmount - (regularBillsAllocation || 0) : 0

    // Calculate how much money is available for discretionary spending in sync period
    const syncDiscretionaryFunds = availableMoney - (syncBillsAllocation || 0)

    return {
      availableMoney,
      totalMonthlyBills,
      cushionAmount,
      billsTargetAmount,

      // Regular period
      regularBillsAllocation: regularBillsAllocation || 0,
      regularEnvelopesTotal,
      regularTotal,
      regularDiscretionaryFunds,
      paycheckAmount: preferences?.paycheckAmount || 0,

      // Sync period
      syncBillsAllocation: syncBillsAllocation || 0,
      syncEnvelopesTotal,
      syncTotal,
      syncDiscretionaryFunds,

      // Monthly calculations
      monthlyBillsFunding,
      isMonthlyFundingSufficient: monthlyBillsFunding >= totalMonthlyBills,
    }
  }, [currentMoney, bills, regularBillsAllocation, regularEnvelopes, syncBillsAllocation, syncEnvelopes, preferences])

  // Calculate validation status
  const validationStatus = useMemo(() => {
    if (!preferences) return { billsValid: false, regularBudgetValid: false, syncBudgetValid: false }

    // Bills validation
    const billsValid =
      bills.every((bill) => bill.name && bill.amount > 0 && bill.dueDay >= 1 && bill.dueDay <= 31) && bills.length > 0

    // Regular budget validation
    const regularBudgetValid =
      (regularBillsAllocation || 0) >= 0 &&
      regularEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.regularTotal === preferences.paycheckAmount &&
      // For limited funds, ensure monthly funding will eventually cover bills
      budgetTotals.isMonthlyFundingSufficient

    // Sync budget validation
    const syncBudgetValid =
      (syncBillsAllocation || 0) >= 0 &&
      syncEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.syncTotal === budgetTotals.availableMoney &&
      budgetTotals.availableMoney > 0

    return {
      billsValid,
      regularBudgetValid,
      syncBudgetValid,
    }
  }, [bills, regularBillsAllocation, regularEnvelopes, syncBillsAllocation, syncEnvelopes, budgetTotals, preferences])

  // Handle bill actions
  const handleAddBill = () => {
    setBills([...bills, { name: "", amount: 0, dueDay: 1, isRecurring: true, category: "" }])
  }

  const handleRemoveBill = (index: number) => {
    setBills(bills.filter((_, i) => i !== index))
  }

  const handleBillChange = (index: number, field: string, value: string | number | boolean) => {
    const newBills = [...bills]
    newBills[index] = {
      ...newBills[index],
      [field]:
        field === "name" || field === "category" ? value : field === "isRecurring" ? Boolean(value) : Number(value),
    }
    setBills(newBills)
  }

  // Handle regular envelope actions
  const handleAddRegularEnvelope = () => {
    setRegularEnvelopes([...regularEnvelopes, { name: "", allocation: 0 }])
  }

  const handleRemoveRegularEnvelope = (index: number) => {
    setRegularEnvelopes(regularEnvelopes.filter((_, i) => i !== index))
  }

  const handleRegularEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...regularEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setRegularEnvelopes(newEnvelopes)
  }

  // Handle sync envelope actions
  const handleAddSyncEnvelope = () => {
    setSyncEnvelopes([...syncEnvelopes, { name: "", allocation: 0 }])
  }

  const handleRemoveSyncEnvelope = (index: number) => {
    setSyncEnvelopes(syncEnvelopes.filter((_, i) => i !== index))
  }

  const handleSyncEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...syncEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setSyncEnvelopes(newEnvelopes)
  }

  // Auto-suggest bills allocation when bills change
  useEffect(() => {
    if (
      setupStep === "regular-budget" &&
      (regularBillsAllocation === null || regularBillsAllocation === 0) &&
      budgetTotals.totalMonthlyBills > 0 &&
      preferences
    ) {
      // Calculate how much we need per paycheck to cover monthly bills (minimum)
      const periodsPerMonth =
        {
          weekly: 4.33,
          biweekly: 2.17,
          semimonthly: 2,
          monthly: 1,
        }[preferences.paycheckFrequency] || 2

      const minimumNeededPerPeriod = budgetTotals.totalMonthlyBills / periodsPerMonth

      // Calculate disposable income after minimum bills allocation
      const disposableAfterMinimum = preferences.paycheckAmount - minimumNeededPerPeriod

      // If we have disposable income, add 10% toward building bills envelope
      if (disposableAfterMinimum > 100) {
        // Leave at least $100 for other expenses
        const extraForBills = Math.floor(disposableAfterMinimum * 0.1)
        setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod + extraForBills))
      } else if (preferences.paycheckAmount >= minimumNeededPerPeriod + 50) {
        // If tight but manageable, just cover minimum plus small buffer
        setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod))
      } else {
        // If very tight, suggest 60% max
        const maxSafePercentage = 0.6
        const suggestedAmount = Math.floor(preferences.paycheckAmount * maxSafePercentage)
        setRegularBillsAllocation(suggestedAmount)
      }
    }
  }, [budgetTotals.totalMonthlyBills, preferences, regularBillsAllocation, setupStep])

  // Auto-suggest sync bills allocation when moving to sync budget step
  useEffect(() => {
    if (
      setupStep === "sync-budget" &&
      (syncBillsAllocation === null || syncBillsAllocation === 0) &&
      budgetTotals.availableMoney > 0
    ) {
      // Calculate bills due during sync period
      const syncPeriodBillsAmount = calculateSyncPeriodBillsAmount()

      // Suggest sync period allocation using consistent 10% rule
      if (budgetTotals.availableMoney >= budgetTotals.billsTargetAmount) {
        // If we have enough money, fully fund the bills envelope with cushion
        setSyncBillsAllocation(Math.round(budgetTotals.billsTargetAmount * 100) / 100)
      } else if (budgetTotals.availableMoney >= syncPeriodBillsAmount) {
        // If we have enough for immediate bills, add up to 10% of remaining funds toward cushion
        const remainingAfterBills = budgetTotals.availableMoney - syncPeriodBillsAmount
        const extraForCushion = Math.min(
          remainingAfterBills * 0.1, // 10% of remaining funds
          budgetTotals.cushionAmount, // Don't exceed cushion amount
        )
        setSyncBillsAllocation(Math.round((syncPeriodBillsAmount + extraForCushion) * 100) / 100)
      } else {
        // If we don't have enough for immediate bills, allocate what we can while keeping some for essential spending
        const maxSafeAllocation = Math.max(
          budgetTotals.availableMoney * 0.7, // Keep at least 30% for essential spending
          Math.min(budgetTotals.availableMoney - 50, syncPeriodBillsAmount), // Or keep at least $50 for spending, whichever is more
        )
        setSyncBillsAllocation(Math.floor(Math.max(0, maxSafeAllocation)))
      }
    }
  }, [
    setupStep,
    syncBillsAllocation,
    budgetTotals.availableMoney,
    budgetTotals.billsTargetAmount,
    budgetTotals.cushionAmount,
  ])

  // Auto-suggest regular envelopes based on available money
  useEffect(() => {
    if (
      setupStep === "regular-budget" &&
      regularEnvelopes.every((env) => env.allocation === 0) &&
      budgetTotals.regularDiscretionaryFunds > 0
    ) {
      // Create a copy of the envelopes
      const newEnvelopes = [...regularEnvelopes]

      // Calculate total allocation based on disposable income after bills
      const totalToAllocate = budgetTotals.regularDiscretionaryFunds

      // Use typical American spending patterns as percentages of disposable income
      // Rounded to nearest $5 to make it practical
      const roundToNearestFive = (amount: number) => Math.round(amount / 5) * 5

      // Base allocations on typical American spending patterns
      const foodAllocation = roundToNearestFive(totalToAllocate * 0.45) // 45% for food
      const entertainmentAllocation = roundToNearestFive(totalToAllocate * 0.18) // 18% for entertainment
      const transportationAllocation = roundToNearestFive(totalToAllocate * 0.22) // 22% for transportation

      // Calculate remaining for savings after the main categories
      const allocatedSoFar = foodAllocation + entertainmentAllocation + transportationAllocation
      const savingsAllocation = Math.max(0, totalToAllocate - allocatedSoFar)

      newEnvelopes[0].allocation = foodAllocation
      newEnvelopes[1].allocation = entertainmentAllocation
      newEnvelopes[2].allocation = transportationAllocation
      newEnvelopes[3].allocation = roundToNearestFive(savingsAllocation)

      setRegularEnvelopes(newEnvelopes)
    }
  }, [setupStep, regularEnvelopes, budgetTotals.regularDiscretionaryFunds])

  // Auto-suggest sync envelopes based on regular envelopes and available money
  useEffect(() => {
    if (
      setupStep === "sync-budget" &&
      syncEnvelopes.every((env) => env.allocation === 0) &&
      budgetTotals.syncDiscretionaryFunds > 0
    ) {
      // Create a copy of the envelopes
      const newEnvelopes = [...syncEnvelopes]

      // Calculate total allocation
      const totalToAllocate = budgetTotals.syncDiscretionaryFunds

      // Calculate proportions from regular envelopes
      const regularTotal = regularEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

      if (regularTotal > 0) {
        // Use same proportions as regular budget
        regularEnvelopes.forEach((regEnv, index) => {
          if (index < newEnvelopes.length) {
            const proportion = regEnv.allocation / regularTotal
            newEnvelopes[index].name = regEnv.name // Copy name
            newEnvelopes[index].allocation = Math.floor(totalToAllocate * proportion)
          }
        })
      } else {
        // Simple percentage-based allocation
        newEnvelopes[0].allocation = Math.floor(totalToAllocate * 0.5) // Food: 50%
        newEnvelopes[1].allocation = Math.floor(totalToAllocate * 0.2) // Entertainment: 20%
        newEnvelopes[2].allocation = Math.floor(totalToAllocate * 0.15) // Transportation: 15%
        newEnvelopes[3].allocation = Math.floor(totalToAllocate * 0.15) // Saving: 15%
      }

      setSyncEnvelopes(newEnvelopes)
    }
  }, [setupStep, syncEnvelopes, regularEnvelopes, budgetTotals.syncDiscretionaryFunds])

  // Helper function to calculate bills due during sync period
  const calculateSyncPeriodBillsAmount = () => {
    if (!periodDates) return 0

    const syncStart = periodDates.syncPeriodStart
    const syncEnd = periodDates.syncPeriodEnd

    // Get the month and year of the sync period
    const syncStartMonth = syncStart.getMonth()
    const syncStartYear = syncStart.getFullYear()
    const syncEndMonth = syncEnd.getMonth()
    const syncEndYear = syncEnd.getFullYear()

    // Calculate bills due during this period
    let totalDue = 0

    bills.forEach((bill) => {
      // Check if bill is due in the start month
      const billDueDateStart = new Date(syncStartYear, syncStartMonth, bill.dueDay)

      // Check if bill is due in the end month (if different from start month)
      const billDueDateEnd = syncStartMonth !== syncEndMonth ? new Date(syncEndYear, syncEndMonth, bill.dueDay) : null

      // Add bill amount if due date falls within sync period
      if (billDueDateStart >= syncStart && billDueDateStart <= syncEnd) {
        totalDue += bill.amount
      }

      if (billDueDateEnd && billDueDateEnd >= syncStart && billDueDateEnd <= syncEnd) {
        totalDue += bill.amount
      }
    })

    return totalDue
  }

  // Navigation functions
  const handleContinueFromBills = () => {
    if (!validationStatus.billsValid) {
      alert("Please ensure all bills have a name, amount, and valid due date.")
      return
    }
    setSetupStep("regular-budget")
  }

  const handleContinueFromRegularBudget = () => {
    if (!validationStatus.regularBudgetValid) {
      alert("Please ensure your regular budget is valid and fully allocated.")
      return
    }
    setSetupStep("sync-budget")
  }

  const handleBackToBills = () => {
    setSetupStep("bills")
  }

  const handleBackToRegularBudget = () => {
    setSetupStep("regular-budget")
  }

  const handleCreateBudget = () => {
    if (!validationStatus.syncBudgetValid) {
      alert("Please ensure your sync period budget is valid and fully allocated.")
      return
    }

    if (!periodDates) return

    // Start with the sync period
    startNewPeriod(
      periodDates.syncPeriodStart,
      preferences?.firstPeriodLength,
      syncEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.firstPeriodLength,
      })),
      periodDates.syncPeriodEnd,
      // Add bills data
      {
        bills,
        initialBalance: syncBillsAllocation || 0,
      },
    )

    // Save the regular period plan for when the sync period ends
    const regularPeriodPlan = {
      envelopes: regularEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.periodLength,
      })),
      bills: bills,
      billsAllocation: regularBillsAllocation || 0, // Add this line to save bills allocation
      savedAt: new Date().toISOString(),
    }

    // Save the regular period plan to localStorage so it can be used when the sync period ends
    const userId = user?.id || "guest"
    const regularPeriodId = `period_${periodDates.regularPeriodStart?.getTime()}`
    const savedPlansJson = localStorage.getItem(`budget_enforcer_period_plans_${userId}`)
    const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

    savedPlans[regularPeriodId] = regularPeriodPlan
    localStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))

    // Also save as the default regular plan template
    localStorage.setItem(`budget_enforcer_regular_plan_${userId}`, JSON.stringify(regularPeriodPlan))
  }

  if (!preferences) return null

  // STEP 1: Bills Setup
  if (setupStep === "bills") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Step 1: Set Up Your Monthly Bills</CardTitle>
          <div className="text-muted-foreground mt-2 space-y-2">
            <p>Let's start by setting up your mandatory bills - these must be covered first.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Why Bills First?</h3>
              <p className="text-sm text-blue-800">
                Bills are your mandatory expenses that must be paid regardless. By setting these up first, you'll know
                exactly how much money is left for discretionary spending. This ensures you never accidentally
                under-budget for essential expenses.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bills List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Your Monthly Bills</span>
                <Button variant="outline" size="sm" onClick={handleAddBill}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Bill
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Column Headers */}
                {bills.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 items-center text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-4">Bill Name</div>
                    <div className="col-span-3">Monthly Amount</div>
                    <div className="col-span-3">Due Day of Month</div>
                    <div className="col-span-2"></div>
                  </div>
                )}

                {bills.map((bill, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        placeholder="e.g., Rent, Electric"
                        value={bill.name}
                        onChange={(e) => handleBillChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={bill.amount}
                        onChange={(e) => handleBillChange(index, "amount", e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="1-31"
                        value={bill.dueDay}
                        onChange={(e) => handleBillChange(index, "dueDay", e.target.value)}
                        min="1"
                        max="31"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveBill(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {bills.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No bills added yet. Add your monthly bills above.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bills Summary */}
          {bills.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle>Bills Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">Monthly Bills Total</p>
                    <p className="text-sm font-medium">{formatCurrency(budgetTotals.totalMonthlyBills)}</p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <p>Recommended Cushion (15%)</p>
                    <p>{formatCurrency(budgetTotals.cushionAmount)}</p>
                  </div>
                  <div className="flex justify-between font-medium">
                    <p>Target Amount</p>
                    <p>{formatCurrency(budgetTotals.billsTargetAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleContinueFromBills} disabled={!validationStatus.billsValid}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Continue to Regular Budget Setup
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // STEP 2: Regular Budget Setup
  if (setupStep === "regular-budget") {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Step 2: Set Up Your Regular Budget</CardTitle>
          <div className="text-muted-foreground mt-2 space-y-2">
            <p>Now let's set up your normal budget that will be used for each pay period.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-left">
              <h4 className="font-semibold text-green-900 mb-1">About Regular Periods</h4>
              <p className="text-xs text-green-800">
                This is your normal budget that will repeat with each paycheck. It establishes how much you'll allocate
                to bills and spending categories during your regular pay periods.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Overview */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded mr-2">REGULAR</span>
                Your Normal Budget Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {format(periodDates.regularPeriodStart, "MMM d")} -{" "}
                {format(periodDates.regularPeriodEnd, "MMM d, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {preferences.periodLength} days • {formatCurrency(preferences.paycheckAmount)} paycheck
              </p>
              <p className="text-xs text-green-700 mt-1 font-medium">This pattern repeats with each paycheck</p>
            </CardContent>
          </Card>

          {/* Bills Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <span>Regular Bills Allocation</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCurrency(regularBillsAllocation || 0)} per paycheck</div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(budgetTotals.monthlyBillsFunding)} per month
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="regular-bills-allocation">Bills Allocation per Paycheck</Label>
                    {budgetTotals.totalMonthlyBills > 0 && preferences && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Calculate how much we need per paycheck to cover monthly bills (minimum)
                          const periodsPerMonth =
                            {
                              weekly: 4.33,
                              biweekly: 2.17,
                              semimonthly: 2,
                              monthly: 1,
                            }[preferences.paycheckFrequency] || 2

                          const minimumNeededPerPeriod = budgetTotals.totalMonthlyBills / periodsPerMonth

                          // Calculate disposable income after minimum bills allocation
                          const disposableAfterMinimum = preferences.paycheckAmount - minimumNeededPerPeriod

                          // If we have disposable income, add 10% toward building bills envelope
                          if (disposableAfterMinimum > 100) {
                            // Leave at least $100 for other expenses
                            const extraForBills = Math.floor(disposableAfterMinimum * 0.1)
                            setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod + extraForBills))
                          } else if (preferences.paycheckAmount >= minimumNeededPerPeriod + 50) {
                            // If tight but manageable, just cover minimum plus small buffer
                            setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod))
                          } else {
                            // If very tight, suggest 60% max
                            const maxSafePercentage = 0.6
                            const suggestedAmount = Math.floor(preferences.paycheckAmount * maxSafePercentage)
                            setRegularBillsAllocation(suggestedAmount)
                          }
                        }}
                      >
                        Suggest Amount
                      </Button>
                    )}
                  </div>
                  <Input
                    id="regular-bills-allocation"
                    type="number"
                    value={regularBillsAllocation === null ? "" : regularBillsAllocation}
                    onChange={(e) => setRegularBillsAllocation(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Amount per paycheck for bills"
                    min="0"
                    step="0.01"
                  />
                  {budgetTotals.totalMonthlyBills > 0 && preferences && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        <strong>Monthly Bills:</strong> {formatCurrency(budgetTotals.totalMonthlyBills)}
                      </p>
                      <p>
                        <strong>Your Monthly Funding:</strong> {formatCurrency(budgetTotals.monthlyBillsFunding)}
                        {budgetTotals.isMonthlyFundingSufficient ? (
                          <span className="text-green-600 ml-1">✓ Sufficient</span>
                        ) : (
                          <span className="text-red-600 ml-1">⚠ Insufficient</span>
                        )}
                      </p>
                      {!budgetTotals.isMonthlyFundingSufficient && (
                        <p className="text-red-600 font-medium">
                          You need at least{" "}
                          {formatCurrency(
                            Math.ceil(
                              budgetTotals.totalMonthlyBills /
                                ({
                                  weekly: 4.33,
                                  biweekly: 2.17,
                                  semimonthly: 2,
                                  monthly: 1,
                                }[preferences.paycheckFrequency] || 2),
                            ),
                          )}{" "}
                          per paycheck to cover monthly bills.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Monthly funding calculation */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm">Monthly Funding Calculation</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Per paycheck allocation:</span>
                      <span>{formatCurrency(regularBillsAllocation || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paychecks per month:</span>
                      <span>
                        {preferences
                          ? {
                              weekly: "~4.3",
                              biweekly: "~2.2",
                              semimonthly: "2",
                              monthly: "1",
                            }[preferences.paycheckFrequency] || "~2"
                          : "~2"}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Monthly total:</span>
                      <span className={budgetTotals.isMonthlyFundingSufficient ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(budgetTotals.monthlyBillsFunding)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Monthly bills:</span>
                      <span>{formatCurrency(budgetTotals.totalMonthlyBills)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Monthly surplus/deficit:</span>
                      <span
                        className={
                          budgetTotals.monthlyBillsFunding >= budgetTotals.totalMonthlyBills
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {budgetTotals.monthlyBillsFunding >= budgetTotals.totalMonthlyBills ? "+" : ""}
                        {formatCurrency(budgetTotals.monthlyBillsFunding - budgetTotals.totalMonthlyBills)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regular Envelopes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Regular Spending Envelopes</span>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatCurrency(budgetTotals.regularEnvelopesTotal)} of{" "}
                    {formatCurrency(budgetTotals.regularDiscretionaryFunds)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Disposable income after bills</span> •{" "}
                    {budgetTotals.regularEnvelopesTotal === budgetTotals.regularDiscretionaryFunds
                      ? "Fully allocated"
                      : `${formatCurrency(Math.abs(budgetTotals.regularDiscretionaryFunds - budgetTotals.regularEnvelopesTotal))} ${budgetTotals.regularEnvelopesTotal > budgetTotals.regularDiscretionaryFunds ? "over budget" : "remaining"}`}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {regularEnvelopes.map((envelope, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Input
                        placeholder="Envelope name"
                        value={envelope.name}
                        onChange={(e) => handleRegularEnvelopeChange(index, "name", e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={envelope.allocation}
                        onChange={(e) => handleRegularEnvelopeChange(index, "allocation", e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveRegularEnvelope(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full mt-2" onClick={handleAddRegularEnvelope}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Envelope
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Budget Summary */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>Regular Budget Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Money for Bills</span>
                  <span>{formatCurrency(regularBillsAllocation || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Money for Spending</span>
                  <span>{formatCurrency(budgetTotals.regularEnvelopesTotal)}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Total</span>
                  <span className={budgetTotals.regularTotal !== preferences.paycheckAmount ? "text-red-600" : ""}>
                    {formatCurrency(budgetTotals.regularTotal)} / {formatCurrency(preferences.paycheckAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning if monthly funding is insufficient */}
          {!budgetTotals.isMonthlyFundingSufficient && budgetTotals.totalMonthlyBills > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Monthly Bills Funding Insufficient</p>
                <p className="text-xs text-red-700 mt-1">
                  Your monthly funding ({formatCurrency(budgetTotals.monthlyBillsFunding)}) is less than your monthly
                  bills ({formatCurrency(budgetTotals.totalMonthlyBills)}). This means your bills envelope will never
                  catch up. You need to increase your regular period bills allocation.
                </p>
                <p className="text-xs text-red-700 mt-1 font-medium">
                  Monthly shortfall: {formatCurrency(budgetTotals.totalMonthlyBills - budgetTotals.monthlyBillsFunding)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBackToBills}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bills Setup
          </Button>
          <Button onClick={handleContinueFromRegularBudget} disabled={!validationStatus.regularBudgetValid}>
            <ArrowRight className="mr-2 h-4 w-4" />
            Continue to Sync Period Setup
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // STEP 3: Sync Budget Setup
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Step 3: Set Up Your Sync Period</CardTitle>
        <div className="text-muted-foreground mt-2 space-y-2">
          <p>Finally, let's set up your sync period to bridge you to your next paycheck.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
            <h4 className="font-semibold text-blue-900 mb-1">About the Sync Period</h4>
            <p className="text-xs text-blue-800">
              The sync period is a one-time transition that gets you from today to your next payday. After this, your
              budget periods will perfectly align with your pay periods, making budgeting much simpler.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Money Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="current-money">How much money do you have available for the sync period?</Label>
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

        {/* Period Overview */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded mr-2">SYNC</span>
              Transition Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {format(periodDates.syncPeriodStart, "MMM d")} - {format(periodDates.syncPeriodEnd, "MMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              {preferences.firstPeriodLength} days to bridge you to your next payday
            </p>
            <p className="text-xs text-blue-700 mt-1 font-medium">One-time period to sync with your pay schedule</p>
          </CardContent>
        </Card>

        {/* Bills Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <span>Sync Period Bills Allocation</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatCurrency(syncBillsAllocation || 0)} of {formatCurrency(budgetTotals.availableMoney)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(budgetTotals.availableMoney - (syncBillsAllocation || 0))} remaining for spending
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sync-bills-allocation">Initial Bills Allocation</Label>
                  {budgetTotals.totalMonthlyBills > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Calculate bills due during sync period
                        const syncPeriodBillsAmount = calculateSyncPeriodBillsAmount()

                        // Smart suggestion based on available money using consistent 10% rule
                        if (budgetTotals.availableMoney >= budgetTotals.billsTargetAmount) {
                          setSyncBillsAllocation(Math.round(budgetTotals.billsTargetAmount * 100) / 100)
                        } else if (budgetTotals.availableMoney >= syncPeriodBillsAmount) {
                          // If we have enough for immediate bills, add up to 10% of remaining funds toward cushion
                          const remainingAfterBills = budgetTotals.availableMoney - syncPeriodBillsAmount
                          const extraForCushion = Math.min(
                            remainingAfterBills * 0.1, // 10% of remaining funds
                            budgetTotals.cushionAmount, // Don't exceed cushion amount
                          )
                          setSyncBillsAllocation(Math.round((syncPeriodBillsAmount + extraForCushion) * 100) / 100)
                        } else {
                          // If we don't have enough for immediate bills, allocate what we can while keeping some for essential spending
                          const maxSafeAllocation = Math.max(
                            budgetTotals.availableMoney * 0.7, // Keep at least 30% for essential spending
                            Math.min(budgetTotals.availableMoney - 50, syncPeriodBillsAmount), // Or keep at least $50 for spending, whichever is more
                          )
                          setSyncBillsAllocation(Math.floor(Math.max(0, maxSafeAllocation)))
                        }
                      }}
                    >
                      Suggest Amount
                    </Button>
                  )}
                </div>
                <Input
                  id="sync-bills-allocation"
                  type="number"
                  value={syncBillsAllocation === null ? "" : syncBillsAllocation}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === "") {
                      setSyncBillsAllocation(null)
                    } else {
                      setSyncBillsAllocation(Number(value))
                    }
                  }}
                  placeholder="Amount to allocate to bills"
                  min="0"
                  step="0.01"
                />
                {budgetTotals.totalMonthlyBills > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {budgetTotals.availableMoney >= budgetTotals.billsTargetAmount ? (
                      <p>
                        Recommended allocation: <strong>{formatCurrency(budgetTotals.billsTargetAmount)}</strong>
                        (bills + 15% cushion) - You have enough to fully fund your bills envelope!
                      </p>
                    ) : budgetTotals.availableMoney >= calculateSyncPeriodBillsAmount() ? (
                      <div>
                        <p>
                          Recommended allocation:{" "}
                          <strong>
                            {formatCurrency(
                              calculateSyncPeriodBillsAmount() +
                                Math.min(
                                  (budgetTotals.availableMoney - calculateSyncPeriodBillsAmount()) * 0.1,
                                  budgetTotals.cushionAmount,
                                ),
                            )}
                          </strong>
                          (immediate bills + 10% of remaining funds toward cushion)
                        </p>
                        <p>Target with full cushion: {formatCurrency(budgetTotals.billsTargetAmount)}</p>
                      </div>
                    ) : (
                      <div>
                        <p>
                          Suggested allocation:{" "}
                          <strong>
                            {formatCurrency(
                              Math.floor(
                                Math.max(
                                  budgetTotals.availableMoney * 0.7,
                                  Math.min(budgetTotals.availableMoney - 50, calculateSyncPeriodBillsAmount()),
                                ),
                              ),
                            )}
                          </strong>
                          (keeping some money for essential spending)
                        </p>
                        <p>
                          Since you have limited funds, we suggest allocating most of your money to bills while keeping
                          some for essential spending during the sync period.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar for bills funding */}
              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-xs">
                  <span>Initial Funding</span>
                  <span>
                    {syncBillsAllocation
                      ? `${Math.min(100, ((syncBillsAllocation || 0) / budgetTotals.billsTargetAmount) * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
                <Progress
                  value={
                    syncBillsAllocation
                      ? Math.min(100, ((syncBillsAllocation || 0) / budgetTotals.billsTargetAmount) * 100)
                      : 0
                  }
                  className="h-2"
                  indicatorColor={
                    (syncBillsAllocation || 0) >= budgetTotals.billsTargetAmount
                      ? "bg-green-500"
                      : (syncBillsAllocation || 0) >= budgetTotals.totalMonthlyBills
                        ? "bg-blue-500"
                        : "bg-amber-500"
                  }
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {(syncBillsAllocation || 0) >= budgetTotals.billsTargetAmount
                      ? "Fully funded with cushion"
                      : (syncBillsAllocation || 0) >= budgetTotals.totalMonthlyBills
                        ? "Bills covered, building cushion"
                        : "Building initial bills fund"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Envelopes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Sync Period Spending Envelopes</span>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatCurrency(budgetTotals.syncEnvelopesTotal)} of{" "}
                  {formatCurrency(budgetTotals.syncDiscretionaryFunds)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {budgetTotals.syncEnvelopesTotal === budgetTotals.syncDiscretionaryFunds &&
                  budgetTotals.syncDiscretionaryFunds > 0
                    ? "Fully allocated"
                    : budgetTotals.syncDiscretionaryFunds > 0
                      ? `${formatCurrency(Math.abs(budgetTotals.syncDiscretionaryFunds - budgetTotals.syncEnvelopesTotal))} ${budgetTotals.syncEnvelopesTotal > budgetTotals.syncDiscretionaryFunds ? "over budget" : "remaining"}`
                      : "No money remaining after bills"}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncEnvelopes.map((envelope, index) => (
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

        {/* Budget Summary */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle>Sync Period Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Money for Bills</span>
                <span>{formatCurrency(syncBillsAllocation || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Money for Spending</span>
                <span>{formatCurrency(budgetTotals.syncEnvelopesTotal)}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Total</span>
                <span className={budgetTotals.syncTotal !== budgetTotals.availableMoney ? "text-red-600" : ""}>
                  {formatCurrency(budgetTotals.syncTotal)} / {formatCurrency(budgetTotals.availableMoney)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limited Funds Strategy Explanation */}
        {syncBillsAllocation &&
          syncBillsAllocation < budgetTotals.totalMonthlyBills &&
          budgetTotals.totalMonthlyBills > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Limited Funds Strategy</p>
                <p className="text-xs text-amber-700 mt-1">
                  You don't have enough money this period to cover all bills (
                  {formatCurrency(budgetTotals.totalMonthlyBills)}). That's okay! Your bills envelope will build up over
                  time through a combination of:
                </p>
                <ul className="text-xs text-amber-700 mt-1 ml-4 list-disc space-y-0.5">
                  <li>This sync period: {formatCurrency(syncBillsAllocation || 0)} (one-time)</li>
                  <li>Regular periods: {formatCurrency(regularBillsAllocation || 0)} per paycheck</li>
                  <li>Monthly total: {formatCurrency(budgetTotals.monthlyBillsFunding)}</li>
                </ul>
                <p className="text-xs text-amber-700 mt-1">
                  Since your monthly funding ({formatCurrency(budgetTotals.monthlyBillsFunding)})
                  {budgetTotals.isMonthlyFundingSufficient
                    ? " exceeds your monthly bills, your envelope will build up over time."
                    : " is less than your monthly bills, you need to increase your regular period allocation."}
                </p>
                <p className="text-xs text-amber-700 mt-1 font-medium">
                  Shortfall this period: {formatCurrency(budgetTotals.totalMonthlyBills - (syncBillsAllocation || 0))}
                </p>
              </div>
            </div>
          )}

        {/* Complete Budget Overview */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Complete Budget Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Sync Period ({preferences.firstPeriodLength} days)</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Bills:</span>
                      <span>{formatCurrency(syncBillsAllocation || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spending:</span>
                      <span>{formatCurrency(budgetTotals.syncEnvelopesTotal)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(budgetTotals.syncTotal)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Regular Period ({preferences.periodLength} days)</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Bills:</span>
                      <span>{formatCurrency(regularBillsAllocation || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spending:</span>
                      <span>{formatCurrency(budgetTotals.regularEnvelopesTotal)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(budgetTotals.regularTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <h3 className="font-medium mb-2">Monthly Bills Strategy</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Monthly Bills Total:</span>
                    <span>{formatCurrency(budgetTotals.totalMonthlyBills)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Funding:</span>
                    <span className={budgetTotals.isMonthlyFundingSufficient ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(budgetTotals.monthlyBillsFunding)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Monthly Surplus/Deficit:</span>
                    <span className={budgetTotals.isMonthlyFundingSufficient ? "text-green-600" : "text-red-600"}>
                      {budgetTotals.monthlyBillsFunding >= budgetTotals.totalMonthlyBills ? "+" : ""}
                      {formatCurrency(budgetTotals.monthlyBillsFunding - budgetTotals.totalMonthlyBills)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleBackToRegularBudget}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Regular Budget
        </Button>
        <Button onClick={handleCreateBudget} disabled={!validationStatus.syncBudgetValid}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Create My Budget
        </Button>
      </CardFooter>
    </Card>
  )
}
