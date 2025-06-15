"use client"

import { useAuth } from "@/context/authContext"
import { useBudget } from "@/context/budgetContext"
import type { Bill } from "@/types/budget"
import { formatCurrency } from "@/utils/budget-calculator"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { format } from "date-fns"
import React, { useMemo, useState } from "react"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"

type PaycheckFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

const periodsPerMonth: Record<PaycheckFrequency, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
};

const periodsPerMonthDisplay: Record<PaycheckFrequency, string> = {
  weekly: "~4.3",
  biweekly: "~2.2",
  semimonthly: "2",
  monthly: "1",
};

export function WelcomeScreen() {
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
      const [firstPayDay, secondPayDay] = preferences.semiMonthlyPayDays.sort((a: number, b: number) => a - b)
      const currentPayDay = regularPeriodStart.getDate()

      if (currentPayDay === firstPayDay) {
        // Next pay is the second pay day of the same month
        regularPeriodEnd.setDate(secondPayDay - 1)
      } else {
        // Next pay is the first pay day of the next month
        regularPeriodEnd = new Date(regularPeriodStart)
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
      const periodsPerMonth: Record<string, number> = {
        weekly: 4.33,
        biweekly: 2.17,
        semimonthly: 2,
        monthly: 1,
      }

      // Monthly funding = regular period allocation × periods per month
      monthlyBillsFunding = (regularBillsAllocation || 0) * (periodsPerMonth[preferences.paycheckFrequency] || 2)
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

  const handleCreateBudget = async () => {
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
      billsAllocation: regularBillsAllocation || 0,
      savedAt: new Date().toISOString(),
    }

    // Save the regular period plan to AsyncStorage so it can be used when the sync period ends
    const userId = user?.id || "guest"
    const regularPeriodId = `period_${periodDates.regularPeriodStart?.getTime()}`
    
    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      savedPlans[regularPeriodId] = regularPeriodPlan
      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))

      // Also save as the default regular plan template
      await AsyncStorage.setItem(`budget_enforcer_regular_plan_${userId}`, JSON.stringify(regularPeriodPlan))
    } catch (error) {
      console.error('Error saving budget data:', error)
      // You might want to show an error message to the user here
    }
  }

  if (!preferences) return null

  // STEP 1: Bills Setup
  if (setupStep === "bills") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Step 1: Set Up Your Monthly Bills</Text>
            <Text style={styles.cardSubtitle}>
              Let's start by setting up your mandatory bills - these must be covered first.
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Why Bills First?</Text>
              <Text style={styles.infoText}>
                Bills are your mandatory expenses that must be paid regardless. By setting these up first, you'll know
                exactly how much money is left for discretionary spending. This ensures you never accidentally
                under-budget for essential expenses.
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Bills List */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Monthly Bills</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddBill}>
                  <Ionicons name="add" size={20} color="#000" />
                  <Text style={styles.buttonText}>Add Bill</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.billsHeader}>
                <Text style={styles.billHeaderText}>Bill Name</Text>
                <Text style={styles.billHeaderText}>Monthly Amount</Text>
                <Text style={styles.billHeaderText}>Due Day of Month</Text>
                <Text style={styles.billHeaderText}></Text>
              </View>
              {bills.map((bill, index) => (
                <View key={index} style={styles.billRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Bill Name"
                    value={bill.name}
                    onChangeText={(value) => handleBillChange(index, "name", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    value={bill.amount.toString()}
                    keyboardType="numeric"
                    onChangeText={(value) => handleBillChange(index, "amount", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Due Day"
                    value={bill.dueDay.toString()}
                    keyboardType="numeric"
                    onChangeText={(value) => handleBillChange(index, "dueDay", value)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveBill(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Bills Summary */}
            {bills.length > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Bills Summary</Text>
                <View style={styles.summaryRow}>
                  <Text>Monthly Bills Total</Text>
                  <Text>{formatCurrency(budgetTotals.totalMonthlyBills)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text>Recommended Cushion (15%)</Text>
                  <Text>{formatCurrency(budgetTotals.cushionAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text>Target Amount</Text>
                  <Text>{formatCurrency(budgetTotals.billsTargetAmount)}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={[styles.button, !validationStatus.billsValid && styles.buttonDisabled]}
              onPress={handleContinueFromBills}
              disabled={!validationStatus.billsValid}
            >
              <Text style={styles.buttonText}>Continue to Regular Budget Setup</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  // STEP 2: Regular Budget Setup
  if (setupStep === "regular-budget") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Step 2: Set Up Your Regular Budget</Text>
            <Text style={styles.cardSubtitle}>
              Now let's set up your normal budget that will be used for each pay period.
            </Text>
            <View style={[styles.infoBox, styles.greenInfoBox]}>
              <Text style={[styles.infoTitle, styles.greenInfoTitle]}>About Regular Periods</Text>
              <Text style={[styles.infoText, styles.greenInfoText]}>
                This is your normal budget that will repeat with each paycheck. It establishes how much you'll allocate
                to bills and spending categories during your regular pay periods.
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Period Overview */}
            <View style={[styles.periodCard, styles.greenPeriodCard]}>
              <Text style={styles.periodTitle}>
                <View style={styles.periodBadgeContainer}>
                  <Text style={styles.periodBadge}>
                    REGULAR
                  </Text> 
                </View>
                <Text style={styles.periodTitle}>
                  Your Normal Budget Period
                </Text>
              </Text>
              <Text style={styles.periodDate}>
                {periodDates && format(periodDates.regularPeriodStart, "MMM d")} -{" "}
                {periodDates && format(periodDates.regularPeriodEnd, "MMM d, yyyy")}
              </Text>
              <Text style={styles.periodInfo}>
                {preferences.periodLength} days • {formatCurrency(preferences.paycheckAmount)} paycheck
              </Text>
              <Text style={styles.periodNote}>This pattern repeats with each paycheck</Text>
            </View>

            {/* Bills Allocation */}
            <View style={styles.billsAllocationCard}>
              <View style={styles.billsAllocationHeader}>
                <View style={styles.billsAllocationTitle}>
                  <View style={styles.billsAllocationIconContainer}>
                    <Ionicons name="calendar" size={20} color="#43a047" />
                  </View>
                  <Text style={styles.billsAllocationTitleText}>Regular Bills Allocation</Text>
                </View>
                <View style={styles.billsAllocationAmounts}>
                  <Text style={styles.billsAllocationAmount}>
                    {formatCurrency(regularBillsAllocation || 0)} per paycheck
                  </Text>
                  <Text style={styles.billsAllocationSubtext}>
                    {formatCurrency(budgetTotals.monthlyBillsFunding)} per month
                  </Text>
                </View>
              </View>

              <View style={styles.billsAllocationContent}>
                <View style={styles.billsAllocationInputContainer}>
                  <View style={styles.billsAllocationInputHeader}>
                    <Text style={styles.billsAllocationLabel}>Bills Allocation per Paycheck</Text>
                    {budgetTotals.totalMonthlyBills > 0 && preferences && (
                      <TouchableOpacity
                        style={styles.suggestButton}
                        onPress={() => {
                          const frequency = preferences.paycheckFrequency as PaycheckFrequency;
                          const periods = periodsPerMonth[frequency] || 2;

                          const minimumNeededPerPeriod = budgetTotals.totalMonthlyBills / periods;
                          const disposableAfterMinimum = preferences.paycheckAmount - minimumNeededPerPeriod;

                          if (disposableAfterMinimum > 100) {
                            const extraForBills = Math.floor(disposableAfterMinimum * 0.1)
                            setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod + extraForBills))
                          } else if (preferences.paycheckAmount >= minimumNeededPerPeriod + 50) {
                            setRegularBillsAllocation(Math.ceil(minimumNeededPerPeriod))
                          } else {
                            const maxSafePercentage = 0.6
                            const suggestedAmount = Math.floor(preferences.paycheckAmount * maxSafePercentage)
                            setRegularBillsAllocation(suggestedAmount)
                          }
                        }}
                      >
                        <Text style={styles.suggestButtonText}>Suggest Amount</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.billsAllocationInput}
                    value={regularBillsAllocation === null ? "" : regularBillsAllocation.toString()}
                    onChangeText={(value) => setRegularBillsAllocation(value === "" ? null : Number(value))}
                    placeholder="Amount per paycheck for bills"
                    keyboardType="numeric"
                  />

                  {budgetTotals.totalMonthlyBills > 0 && preferences && (
                    <View style={styles.billsAllocationInfo}>
                      <Text style={styles.billsAllocationInfoText}>
                        <Text style={styles.billsAllocationInfoBold}>Monthly Bills:</Text>{" "}
                        {formatCurrency(budgetTotals.totalMonthlyBills)}
                      </Text>
                      <Text style={styles.billsAllocationInfoText}>
                        <Text style={styles.billsAllocationInfoBold}>Your Monthly Funding:</Text>{" "}
                        {formatCurrency(budgetTotals.monthlyBillsFunding)}
                        {budgetTotals.isMonthlyFundingSufficient ? (
                          <Text style={styles.successText}> ✓ Sufficient</Text>
                        ) : (
                          <Text style={styles.errorText}> ⚠ Insufficient</Text>
                        )}
                      </Text>
                      {!budgetTotals.isMonthlyFundingSufficient && (
                        <Text style={[styles.billsAllocationInfoText, styles.errorText, styles.billsAllocationInfoBold]}>
                          You need at least{" "}
                          {formatCurrency(
                            Math.ceil(
                              budgetTotals.totalMonthlyBills /
                                periodsPerMonth[preferences.paycheckFrequency as PaycheckFrequency] || 2
                            ),
                          )}{" "}
                          per paycheck to cover monthly bills.
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Monthly funding calculation */}
                <View style={styles.monthlyCalculationContainer}>
                  <Text style={styles.monthlyCalculationTitle}>Monthly Funding Calculation</Text>
                  <View style={styles.monthlyCalculationContent}>
                    <View style={styles.monthlyCalculationRow}>
                      <Text style={styles.monthlyCalculationLabel}>Per paycheck allocation:</Text>
                      <Text style={styles.monthlyCalculationValue}>
                        {formatCurrency(regularBillsAllocation || 0)}
                      </Text>
                    </View>
                    <View style={styles.monthlyCalculationRow}>
                      <Text style={styles.monthlyCalculationLabel}>Paychecks per month:</Text>
                      <Text style={styles.monthlyCalculationValue}>
                        {preferences
                          ? periodsPerMonthDisplay[preferences.paycheckFrequency as PaycheckFrequency] || "~2"
                          : "~2"}
                      </Text>
                    </View>
                    <View style={[styles.monthlyCalculationRow, styles.monthlyCalculationTotal]}>
                      <Text style={styles.monthlyCalculationLabel}>Monthly total:</Text>
                      <Text
                        style={[
                          styles.monthlyCalculationValue,
                          budgetTotals.isMonthlyFundingSufficient ? styles.successText : styles.errorText,
                        ]}
                      >
                        {formatCurrency(budgetTotals.monthlyBillsFunding)}
                      </Text>
                    </View>
                    <View style={styles.monthlyCalculationRow}>
                      <Text style={[styles.monthlyCalculationLabel, styles.mutedText]}>Monthly bills:</Text>
                      <Text style={[styles.monthlyCalculationValue, styles.mutedText]}>
                        {formatCurrency(budgetTotals.totalMonthlyBills)}
                      </Text>
                    </View>
                    <View style={styles.monthlyCalculationRow}>
                      <Text style={styles.monthlyCalculationLabel}>Monthly surplus/deficit:</Text>
                      <Text
                        style={[
                          styles.monthlyCalculationValue,
                          budgetTotals.monthlyBillsFunding >= budgetTotals.totalMonthlyBills
                            ? styles.successText
                            : styles.errorText,
                        ]}
                      >
                        {budgetTotals.monthlyBillsFunding >= budgetTotals.totalMonthlyBills ? "+" : ""}
                        {formatCurrency(budgetTotals.monthlyBillsFunding - budgetTotals.totalMonthlyBills)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Regular Envelopes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Regular Spending Envelopes</Text>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryAmount}>
                    {formatCurrency(budgetTotals.regularEnvelopesTotal)} of{" "}
                    {formatCurrency(budgetTotals.regularDiscretionaryFunds)}
                  </Text>
                  <Text style={styles.summarySubtext}>
                    {budgetTotals.regularEnvelopesTotal === budgetTotals.regularDiscretionaryFunds
                      ? "Fully allocated"
                      : `${formatCurrency(Math.abs(budgetTotals.regularDiscretionaryFunds - budgetTotals.regularEnvelopesTotal))} ${
                          budgetTotals.regularEnvelopesTotal > budgetTotals.regularDiscretionaryFunds ? "over budget" : "remaining"
                        }`}
                  </Text>
                </View>
              </View>

              {regularEnvelopes.map((envelope, index) => (
                <View key={index} style={styles.envelopeRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Envelope name"
                    value={envelope.name}
                    onChangeText={(value) => handleRegularEnvelopeChange(index, "name", value)}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    value={envelope.allocation.toString()}
                    keyboardType="numeric"
                    onChangeText={(value) => handleRegularEnvelopeChange(index, "allocation", value)}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveRegularEnvelope(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addButton} onPress={handleAddRegularEnvelope}>
                <Ionicons name="add" size={20} color="#000" />
                <Text style={styles.buttonText}>Add Envelope</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Regular Budget Summary</Text>
            </View>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text>Money for Bills</Text>
                <Text>{formatCurrency(regularBillsAllocation || 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text>Money for Spending</Text>
                <Text>{formatCurrency(budgetTotals.regularEnvelopesTotal)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalText}>Total</Text>
                <Text style={[
                  styles.summaryTotalAmount,
                  budgetTotals.regularTotal !== preferences.paycheckAmount && styles.summaryError
                ]}>
                  {formatCurrency(budgetTotals.regularTotal)} / {formatCurrency(preferences.paycheckAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Warning if monthly funding is insufficient */}
          {!budgetTotals.isMonthlyFundingSufficient && budgetTotals.totalMonthlyBills > 0 && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#ef4444" style={styles.warningIcon} />
              <View>
                <Text style={styles.warningTitle}>Monthly Bills Funding Insufficient</Text>
                <Text style={styles.warningText}>
                  Your monthly funding ({formatCurrency(budgetTotals.monthlyBillsFunding)}) is less than your monthly
                  bills ({formatCurrency(budgetTotals.totalMonthlyBills)}). This means your bills envelope will never
                  catch up. You need to increase your regular period bills allocation.
                </Text>
                <Text style={[styles.warningText, styles.warningHighlight]}>
                  Monthly shortfall: {formatCurrency(budgetTotals.totalMonthlyBills - budgetTotals.monthlyBillsFunding)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.cardFooter}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToBills}>
              <Ionicons name="arrow-back" size={20} color="#000" />
              <Text style={styles.buttonText}>Back to Bills Setup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, !validationStatus.regularBudgetValid && styles.buttonDisabled]}
              onPress={handleContinueFromRegularBudget}
              disabled={!validationStatus.regularBudgetValid}
            >
              <Text style={styles.buttonText}>Continue to Sync Period Setup</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  // STEP 3: Sync Budget Setup
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Step 3: Set Up Your Sync Period</Text>
          <Text style={styles.cardSubtitle}>
            Finally, let's set up your sync period to bridge you to your next paycheck.
          </Text>
          <View style={[styles.infoBox, styles.blueInfoBox]}>
            <Text style={[styles.infoTitle, styles.blueInfoTitle]}>About the Sync Period</Text>
            <Text style={[styles.infoText, styles.blueInfoText]}>
              The sync period is a one-time transition that gets you from today to your next payday. After this, your
              budget periods will perfectly align with your pay periods, making budgeting much simpler.
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Available Money Input */}
          <View style={styles.section}>
            <Text style={styles.inputLabel}>How much money do you have available for the sync period?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={currentMoney}
              keyboardType="numeric"
              onChangeText={setCurrentMoney}
            />
            <Text style={styles.inputHelp}>
              This is the money you have right now that needs to last until your next paycheck.
            </Text>
          </View>

          {/* Period Overview */}
          <View style={[styles.periodCard, styles.bluePeriodCard]}>
            <Text style={styles.periodTitle}>
              <Text style={styles.periodBadge}>SYNC</Text> Transition Period
            </Text>
            <Text style={styles.periodDate}>
              {periodDates && format(periodDates.syncPeriodStart, "MMM d")} -{" "}
              {periodDates && format(periodDates.syncPeriodEnd, "MMM d, yyyy")}
            </Text>
            <Text style={styles.periodInfo}>
              {preferences.firstPeriodLength} days to bridge you to your next payday
            </Text>
            <Text style={styles.periodNote}>One-time period to sync with your pay schedule</Text>
          </View>

          {/* Sync Envelopes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sync Period Spending Envelopes</Text>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(budgetTotals.syncEnvelopesTotal)} of{" "}
                  {formatCurrency(budgetTotals.syncDiscretionaryFunds)}
                </Text>
                <Text style={styles.summarySubtext}>
                  {budgetTotals.syncEnvelopesTotal === budgetTotals.syncDiscretionaryFunds &&
                  budgetTotals.syncDiscretionaryFunds > 0
                    ? "Fully allocated"
                    : budgetTotals.syncDiscretionaryFunds > 0
                    ? `${formatCurrency(Math.abs(budgetTotals.syncDiscretionaryFunds - budgetTotals.syncEnvelopesTotal))} ${
                        budgetTotals.syncEnvelopesTotal > budgetTotals.syncDiscretionaryFunds ? "over budget" : "remaining"
                      }`
                    : "No money remaining after bills"}
                </Text>
              </View>
            </View>

            {syncEnvelopes.map((envelope, index) => (
              <View key={index} style={styles.envelopeRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Envelope name"
                  value={envelope.name}
                  onChangeText={(value) => handleSyncEnvelopeChange(index, "name", value)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Amount"
                  value={envelope.allocation.toString()}
                  keyboardType="numeric"
                  onChangeText={(value) => handleSyncEnvelopeChange(index, "allocation", value)}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveSyncEnvelope(index)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={handleAddSyncEnvelope}>
              <Ionicons name="add" size={20} color="#000" />
              <Text style={styles.buttonText}>Add Envelope</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToRegularBudget}>
            <Ionicons name="arrow-back" size={20} color="#000" />
            <Text style={styles.buttonText}>Back to Regular Budget</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !validationStatus.syncBudgetValid && styles.buttonDisabled]}
            onPress={handleCreateBudget}
            disabled={!validationStatus.syncBudgetValid}
          >
            <Text style={styles.buttonText}>Create My Budget</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    overflow: "scroll",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
    flex: 2,
  },
  cardFooter: {
    flex: 1,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoBox: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  greenInfoBox: {
    backgroundColor: "#f0fff4",
  },
  blueInfoBox: {
    backgroundColor: "#f0f7ff",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a56db",
    marginBottom: 4,
  },
  greenInfoTitle: {
    color: "#059669",
  },
  blueInfoTitle: {
    color: "#1a56db",
  },
  infoText: {
    fontSize: 14,
    color: "#4b5563",
  },
  greenInfoText: {
    color: "#065f46",
  },
  blueInfoText: {
    color: "#1e40af",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputHelp: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginTop: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a56db",
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "#000",
    fontWeight: "500",
    marginRight: 8,
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContent: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 8,
  },
  summaryTotalText: {
    fontWeight: '500',
  },
  summaryTotalAmount: {
    fontWeight: '500',
  },
  summaryError: {
    color: '#dc2626',
  },
  warningContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
  },
  warningIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#991b1b',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#b91c1c',
    marginBottom: 4,
  },
  warningHighlight: {
    fontWeight: '500',
  },
  periodCard: {
    backgroundColor: "#f0f7ff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  greenPeriodCard: {
    backgroundColor: "#f0fff4",
  },
  bluePeriodCard: {
    backgroundColor: "#f0f7ff",
  },
  periodTitle: {
    textAlign: "center",
    verticalAlign: 'middle',
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  periodBadge: {
    backgroundColor: "#43a047",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  periodDate: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  periodInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  periodNote: {
    fontSize: 14,
    color: "#1a56db",
    fontWeight: "500",
  },
  summaryInfo: {
    alignItems: "flex-end",
  },
  summaryAmount: {
    fontSize: 12,
    fontWeight: "500",
  },
  summarySubtext: {
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    padding: 16,
  },
  billsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  billHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  periodBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billsAllocationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  billsAllocationHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billsAllocationTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billsAllocationIconContainer: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  billsAllocationTitleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  billsAllocationAmounts: {
    alignItems: 'flex-end',
  },
  billsAllocationAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  billsAllocationSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  billsAllocationContent: {
    padding: 16,
  },
  billsAllocationInputContainer: {
    marginBottom: 16,
  },
  billsAllocationInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billsAllocationLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  billsAllocationInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  billsAllocationInfo: {
    marginTop: 8,
  },
  billsAllocationInfoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  billsAllocationInfoBold: {
    fontWeight: '500',
  },
  successText: {
    color: '#059669',
  },
  errorText: {
    color: '#dc2626',
  },
  monthlyCalculationContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  monthlyCalculationTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  monthlyCalculationContent: {
    gap: 4,
  },
  monthlyCalculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlyCalculationLabel: {
    fontSize: 12,
  },
  monthlyCalculationValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthlyCalculationTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  mutedText: {
    color: '#6b7280',
  },
})
