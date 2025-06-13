"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type {
  Envelope,
  Purchase,
  StatusResult,
  ShuffleAllocation,
  ShuffleTransaction,
  Period,
  ShuffleLimit,
  UserPreferences,
  Bill,
  BillsEnvelope,
} from "../types/budget"
import { calculateStatus, updateEnvelopeStatus, getCurrentDay, getStatusDetails } from "../utils/budgetCalculator"
import { useAuth } from "./AuthContext"
import { v4 as uuidv4 } from "uuid"

// Storage keys
const ENVELOPES_KEY = "budget_enforcer_envelopes"
const PURCHASES_KEY = "budget_enforcer_purchases"
const SHUFFLES_KEY = "budget_enforcer_shuffles"
const PERIODS_KEY = "budget_enforcer_periods"
const SHUFFLE_LIMITS_KEY = "budget_enforcer_shuffle_limits"

// Sample suggested envelopes (for new users)
export const suggestedEnvelopes = [
  { name: "Food", allocation: 400, spent: 0, periodLength: 14 },
  { name: "Entertainment", allocation: 200, spent: 0, periodLength: 14 },
  { name: "Transportation", allocation: 150, spent: 0, periodLength: 14 },
]

interface BudgetContextType {
  envelopes: Envelope[]
  currentEnvelope: Envelope | null
  setCurrentEnvelope: (envelope: Envelope | null) => void
  statusResult: StatusResult | null
  simulatePurchase: (purchase: Omit<Purchase, "id">) => void
  resetSimulation: () => void
  confirmPurchase: () => void
  currentPurchase: Purchase | null
  addEnvelope: (envelope: Omit<Envelope, "id" | "color">) => void
  updateEnvelope: (envelope: Envelope) => void
  deleteEnvelope: (id: string) => void
  showStatusScreen: boolean
  setShowStatusScreen: (show: boolean) => void
  showShuffleScreen: boolean
  setShowShuffleScreen: (show: boolean) => void
  shuffleEnvelopes: (targetEnvelopeId: string, purchase: Purchase, allocations: ShuffleAllocation[]) => void
  purchases: Purchase[]
  shuffleTransactions: ShuffleTransaction[]
  periods: Period[]
  currentPeriod: Period | null
  shuffleLimits: ShuffleLimit[]
  updateShuffleLimit: (envelopeId: string, maxAmount: number) => void
  startNewPeriod: (startDate: Date, periodLength: number, envelopes: Omit<Envelope, "id" | "color">[]) => void
  hasActiveBudget: boolean
  getNextPeriods: () => Array<{
    id: string
    startDate: Date
    endDate: Date
    periodLength: number
    isPlanned: boolean
    isCurrent?: boolean
  }>
  savePeriodPlan: (
    periodId: string,
    plan: {
      envelopes: Omit<Envelope, "id" | "color" | "startDate">[]
      billsAllocation?: number
    },
  ) => void
  getPeriodPlan: (periodId: string) => {
    envelopes: Omit<Envelope, "id" | "color" | "startDate">[]
    billsAllocation?: number
  } | null
  deletePeriodPlan: (periodId: string) => void
  billsEnvelope: BillsEnvelope | null
  addBill: (bill: Omit<Bill, "id">) => void
  updateBill: (id: string, updates: Partial<Bill>) => void
  deleteBill: (id: string) => void
  addMoneyToBills: (amount: number) => void
  payBill: (billId: string) => void
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

// Calculate the next N periods based on user preferences
const calculateNextPeriods = (
  userPreferences: UserPreferences,
  currentPeriod: Period | null,
  count = 3,
): Array<{
  id: string
  startDate: Date
  endDate: Date
  periodLength: number
  isPlanned: boolean
  isCurrent?: boolean
}> => {
  if (!userPreferences) return []

  const periods = []
  let nextStart: Date

  // If we have a current period, include it as the first "next" period
  if (currentPeriod) {
    // Calculate the actual period length from the stored dates
    const actualPeriodLength = Math.ceil(
      (currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24),
    )

    periods.push({
      id: currentPeriod.id,
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      periodLength: actualPeriodLength,
      isPlanned: true, // Current period is always "planned"
      isCurrent: true,
    })

    // Start calculating future periods from the day after current period ends
    nextStart = new Date(currentPeriod.endDate)
    nextStart.setDate(nextStart.getDate() + 1)
    nextStart.setHours(0, 0, 0, 0)
    count = count - 1 // We already added the current period
  } else {
    // If no current period, start from the next paycheck date
    nextStart = new Date(userPreferences.nextPayday)
    nextStart.setHours(0, 0, 0, 0)
  }

  // Calculate future periods based on paycheck frequency
  for (let i = 0; i < count; i++) {
    const startDate = new Date(nextStart)
    let endDate: Date
    let periodLength: number

    switch (userPreferences.paycheckFrequency) {
      case "monthly":
        // For monthly, find the next occurrence of the pay day
        const payDay = userPreferences.nextPayday.getDate()
        const nextPayMonth = new Date(startDate)

        // If we're already past the pay day in the current month, move to next month
        if (startDate.getDate() > payDay) {
          nextPayMonth.setMonth(nextPayMonth.getMonth() + 1)
        }

        // Set to the pay day
        nextPayMonth.setDate(payDay)

        // If we ended up with a date before our start date, move to the next month
        if (nextPayMonth <= startDate) {
          nextPayMonth.setMonth(nextPayMonth.getMonth() + 1)
        }

        // End date is the day before the next pay day
        endDate = new Date(nextPayMonth)
        endDate.setDate(nextPayMonth.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)

        // Calculate actual period length
        periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        break

      case "semimonthly":
        if (!userPreferences.semiMonthlyPayDays) {
          throw new Error("Semi-monthly pay days not configured")
        }

        const [firstPayDay, secondPayDay] = userPreferences.semiMonthlyPayDays.sort((a, b) => a - b)
        const currentDay = startDate.getDate()

        let nextPayDay: Date

        if (currentDay <= firstPayDay) {
          // Next pay is the first pay day of the current month
          nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth(), firstPayDay)
        } else if (currentDay <= secondPayDay) {
          // Next pay is the second pay day of the current month
          nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth(), secondPayDay)
        } else {
          // Next pay is the first pay day of the next month
          nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, firstPayDay)
        }

        // If the next pay day is not after our start date, move to the next pay period
        if (nextPayDay <= startDate) {
          if (nextPayDay.getDate() === firstPayDay) {
            // Move to the second pay day of the same month
            nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth(), secondPayDay)
          } else {
            // Move to the first pay day of the next month
            nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, firstPayDay)
          }
        }

        // End date is the day before the next pay day
        endDate = new Date(nextPayDay)
        endDate.setDate(nextPayDay.getDate() - 1)
        endDate.setHours(23, 59, 59, 999)

        // Calculate actual period length
        periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        break

      case "weekly":
        periodLength = 7
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + periodLength - 1)
        endDate.setHours(23, 59, 59, 999)
        break

      case "biweekly":
      default:
        periodLength = 14
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + periodLength - 1)
        endDate.setHours(23, 59, 59, 999)
        break
    }

    periods.push({
      id: `future_period_${startDate.getTime()}`,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      periodLength,
      isPlanned: false, // Will be updated based on saved plans
    })

    // For the next iteration, set nextStart to the day after this period's end date
    nextStart = new Date(endDate)
    nextStart.setDate(endDate.getDate() + 1)
    nextStart.setHours(0, 0, 0, 0)
  }

  return periods
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id || "guest"

  const [envelopes, setEnvelopes] = useState<Envelope[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [shuffleTransactions, setShuffleTransactions] = useState<ShuffleTransaction[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [shuffleLimits, setShuffleLimits] = useState<ShuffleLimit[]>([])
  const [hasActiveBudget, setHasActiveBudget] = useState(false)

  const [currentEnvelope, setCurrentEnvelope] = useState<Envelope | null>(null)
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null)
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null)
  const [showStatusScreen, setShowStatusScreen] = useState(false)
  const [showShuffleScreen, setShowShuffleScreen] = useState(false)

  const [billsEnvelope, setBillsEnvelope] = useState<BillsEnvelope | null>(null)

  // Get the current period
  const currentPeriod = periods.length > 0 ? periods[periods.length - 1] : null

  // Load data from AsyncStorage when user changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load envelopes
        const envelopesJson = await AsyncStorage.getItem(`${ENVELOPES_KEY}_${userId}`)
        if (envelopesJson) {
          const loadedEnvelopes = JSON.parse(envelopesJson).map((env: any) => ({
            ...env,
            startDate: new Date(env.startDate),
          }))
          setEnvelopes(loadedEnvelopes.map(updateEnvelopeStatus))
          setHasActiveBudget(loadedEnvelopes.length > 0)
        } else {
          setEnvelopes([])
          setHasActiveBudget(false)
        }

        // Load purchases
        const purchasesJson = await AsyncStorage.getItem(`${PURCHASES_KEY}_${userId}`)
        if (purchasesJson) {
          const loadedPurchases = JSON.parse(purchasesJson).map((purchase: any) => ({
            ...purchase,
            date: new Date(purchase.date),
          }))
          setPurchases(loadedPurchases)
        } else {
          setPurchases([])
        }

        // Load shuffle transactions
        const shufflesJson = await AsyncStorage.getItem(`${SHUFFLES_KEY}_${userId}`)
        if (shufflesJson) {
          const loadedShuffles = JSON.parse(shufflesJson).map((shuffle: any) => ({
            ...shuffle,
            date: new Date(shuffle.date),
          }))
          setShuffleTransactions(loadedShuffles)
        } else {
          setShuffleTransactions([])
        }

        // Load periods
        const periodsJson = await AsyncStorage.getItem(`${PERIODS_KEY}_${userId}`)
        if (periodsJson) {
          const loadedPeriods = JSON.parse(periodsJson).map((period: any) => ({
            ...period,
            startDate: new Date(period.startDate),
            endDate: new Date(period.endDate),
            envelopes: period.envelopes.map((env: any) => ({
              ...env,
              startDate: new Date(env.startDate),
            })),
            transactions: period.transactions.map((transaction: any) => ({
              ...transaction,
              date: new Date(transaction.date),
            })),
          }))
          setPeriods(loadedPeriods)
        } else {
          setPeriods([])
        }

        // Load shuffle limits
        const limitsJson = await AsyncStorage.getItem(`${SHUFFLE_LIMITS_KEY}_${userId}`)
        if (limitsJson) {
          setShuffleLimits(JSON.parse(limitsJson))
        } else {
          setShuffleLimits([])
        }

        // Load bills envelope
        const billsJson = await AsyncStorage.getItem(`budget_enforcer_bills_${userId}`)
        if (billsJson) {
          const loadedBills = JSON.parse(billsJson)
          setBillsEnvelope({
            ...loadedBills,
            nextDueDate: new Date(loadedBills.nextDueDate),
            bills: loadedBills.bills.map((bill: any) => ({
              ...bill,
              lastPaidDate: bill.lastPaidDate ? new Date(bill.lastPaidDate) : undefined,
            })),
          })
        } else {
          // Initialize empty bills envelope
          setBillsEnvelope({
            id: "bills_envelope",
            name: "Bills",
            totalMonthlyBills: 0,
            cushionAmount: 0,
            targetAmount: 0,
            currentBalance: 0,
            bills: [],
            nextDueDate: new Date(),
            nextDueAmount: 0,
            isFullyFunded: true,
            hasReachedCushion: true,
            requiredPerPaycheck: 0,
          })
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadData()
  }, [user, userId])

  // Save data to AsyncStorage when it changes
  useEffect(() => {
    if (!user) return

    const saveData = async () => {
      try {
        await AsyncStorage.setItem(`${ENVELOPES_KEY}_${userId}`, JSON.stringify(envelopes))
        await AsyncStorage.setItem(`${PURCHASES_KEY}_${userId}`, JSON.stringify(purchases))
        await AsyncStorage.setItem(`${SHUFFLES_KEY}_${userId}`, JSON.stringify(shuffleTransactions))
        await AsyncStorage.setItem(`${PERIODS_KEY}_${userId}`, JSON.stringify(periods))
        await AsyncStorage.setItem(`${SHUFFLE_LIMITS_KEY}_${userId}`, JSON.stringify(shuffleLimits))
        await AsyncStorage.setItem(`budget_enforcer_bills_${userId}`, JSON.stringify(billsEnvelope))
      } catch (error) {
        console.error("Error saving data:", error)
      }
    }

    saveData()
  }, [user, userId, envelopes, purchases, shuffleTransactions, periods, shuffleLimits, billsEnvelope])

  // Calculate initial status when current envelope changes
  useEffect(() => {
    if (currentEnvelope) {
      const result = calculateStatus(currentEnvelope)
      setStatusResult(result)
    }
  }, [currentEnvelope])

  // Simulate a purchase
  const simulatePurchase = (purchaseData: Omit<Purchase, "id">) => {
    if (!currentEnvelope) return

    const newPurchase: Purchase = {
      ...purchaseData,
      id: uuidv4(),
    }

    setCurrentPurchase(newPurchase)

    // Calculate the status after this purchase
    const envelope = envelopes.find((env) => env.id === purchaseData.envelopeId)
    if (!envelope) return

    const currentStatus = calculateStatus(envelope)
    const currentDay = getCurrentDay(envelope)
    const remainingAmount = envelope.allocation - envelope.spent
    const dailyAmount = envelope.allocation / envelope.periodLength

    // Calculate days worth of spending after the purchase
    const spentAfterPurchase = envelope.spent + purchaseData.amount
    const daysWorthAfterPurchase = dailyAmount > 0 ? spentAfterPurchase / dailyAmount : 0

    // Determine the status after the purchase
    let status: StatusResult["status"]
    if (purchaseData.amount > remainingAmount) {
      status = "budget-breaker"
    } else if (remainingAmount - purchaseData.amount <= 0) {
      status = "envelope-empty"
    } else {
      // Calculate what percentage of the period has passed
      const percentOfPeriodPassed = (currentDay / envelope.periodLength) * 100

      // Calculate what percentage of the allocation would be spent after the purchase
      const percentSpentAfter = ((envelope.spent + purchaseData.amount) / envelope.allocation) * 100

      if (percentSpentAfter <= percentOfPeriodPassed * 0.8) {
        status = "super-safe"
      } else if (percentSpentAfter <= percentOfPeriodPassed * 0.9) {
        status = "safe"
      } else if (percentSpentAfter <= percentOfPeriodPassed * 1.1) {
        status = "off-track"
      } else if (percentSpentAfter <= percentOfPeriodPassed * 1.2) {
        status = "danger"
      } else {
        status = "budget-breaker"
      }
    }

    const statusDetails = getStatusDetails(status)

    setStatusResult({
      status,
      statusText: statusDetails.text,
      statusColor: statusDetails.color,
      statusBorderColor: statusDetails.borderColor,
      statusTextColor: statusDetails.textColor,
      statusIcon: statusDetails.icon,
      envelopeName: envelope.name,
      currentDay,
      periodLength: envelope.periodLength,
      daysWorthOfSpending: currentStatus.daysWorth,
      daysWorthAfterPurchase,
      remainingAmount,
    })

    setShowStatusScreen(true)
  }

  // Reset the simulation
  const resetSimulation = () => {
    setCurrentPurchase(null)
    setStatusResult(null)
    setShowStatusScreen(false)
    setShowShuffleScreen(false)
  }

  // Confirm the purchase
  const confirmPurchase = () => {
    if (!currentPurchase || !currentEnvelope) return

    // Add the purchase to the list
    setPurchases([...purchases, currentPurchase])

    // Update the envelope's spent amount
    const updatedEnvelopes = envelopes.map((env) => {
      if (env.id === currentPurchase.envelopeId) {
        return {
          ...env,
          spent: env.spent + currentPurchase.amount,
        }
      }
      return env
    })

    setEnvelopes(updatedEnvelopes)
    resetSimulation()
  }

  // Shuffle envelopes
  const shuffleEnvelopes = (targetEnvelopeId: string, purchase: Purchase, allocations: ShuffleAllocation[]) => {
    // Calculate the total amount being shuffled
    const totalShuffled = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)

    // Create a new shuffle transaction
    const newTransaction: ShuffleTransaction = {
      id: uuidv4(),
      targetEnvelopeId,
      allocations,
      date: new Date(),
    }

    setShuffleTransactions([...shuffleTransactions, newTransaction])

    // Update the envelopes
    const updatedEnvelopes = envelopes.map((env) => {
      // If this is the target envelope, add the shuffled amount to its allocation
      if (env.id === targetEnvelopeId) {
        return {
          ...env,
          allocation: env.allocation + totalShuffled,
          spent: env.spent + purchase.amount, // Also add the purchase amount to spent
        }
      }

      // If this envelope is a source for the shuffle, reduce its allocation
      const allocation = allocations.find((alloc) => alloc.envelopeId === env.id)
      if (allocation) {
        return {
          ...env,
          allocation: env.allocation - allocation.amount,
        }
      }

      return env
    })

    setEnvelopes(updatedEnvelopes)

    // Update shuffle limits
    const updatedLimits = shuffleLimits.map((limit) => {
      const allocation = allocations.find((alloc) => alloc.envelopeId === limit.envelopeId)
      if (allocation) {
        return {
          ...limit,
          currentShuffled: limit.currentShuffled + allocation.amount,
        }
      }
      return limit
    })

    setShuffleLimits(updatedLimits)

    // Add the purchase to the list
    setPurchases([...purchases, purchase])

    // Reset the simulation state
    resetSimulation()
  }

  // Add a new envelope
  const addEnvelope = (envelope: Omit<Envelope, "id" | "color">) => {
    const newEnvelope: Envelope = {
      ...envelope,
      id: uuidv4(),
      color: getRandomColor(),
    }

    setEnvelopes([...envelopes, newEnvelope])

    // Initialize shuffle limit for the new envelope
    setShuffleLimits([
      ...shuffleLimits,
      {
        envelopeId: newEnvelope.id,
        maxAmount: 0,
        currentShuffled: 0,
      },
    ])
  }

  // Update an envelope
  const updateEnvelope = (updatedEnvelope: Envelope) => {
    setEnvelopes(envelopes.map((env) => (env.id === updatedEnvelope.id ? updatedEnvelope : env)))
  }

  // Delete an envelope
  const deleteEnvelope = (id: string) => {
    setEnvelopes(envelopes.filter((env) => env.id !== id))
    // Also remove related shuffle limits
    setShuffleLimits(shuffleLimits.filter((limit) => limit.envelopeId !== id))
  }

  // Update shuffle limit for an envelope
  const updateShuffleLimit = (envelopeId: string, maxAmount: number) => {
    const updatedLimits = shuffleLimits.map((limit) => {
      if (limit.envelopeId === envelopeId) {
        return {
          ...limit,
          maxAmount,
        }
      }
      return limit
    })

    setShuffleLimits(updatedLimits)
  }

  // Start a new period
  const startNewPeriod = (startDate: Date, periodLength: number, newEnvelopes: Omit<Envelope, "id" | "color">[]) => {
    // Create new envelopes with IDs and colors
    const envelopesWithIds = newEnvelopes.map((env) => ({
      ...env,
      id: uuidv4(),
      color: getRandomColor(),
      startDate,
      periodLength,
    }))

    setEnvelopes(envelopesWithIds)

    // Initialize shuffle limits for all envelopes
    const newShuffleLimits = envelopesWithIds.map((env) => ({
      envelopeId: env.id,
      maxAmount: 0,
      currentShuffled: 0,
    }))

    setShuffleLimits(newShuffleLimits)

    // Reset other state
    setPurchases([])
    setShuffleTransactions([])
    setCurrentEnvelope(null)
    resetSimulation()
  }

  // Helper function to generate random colors for envelopes
  const getRandomColor = () => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-orange-500",
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  return (
    <BudgetContext.Provider
      value={{
        envelopes,
        purchases,
        shuffleTransactions,
        shuffleLimits,
        currentEnvelope,
        currentPurchase,
        statusResult,
        showStatusScreen,
        showShuffleScreen,
        setCurrentEnvelope,
        addEnvelope,
        updateEnvelope,
        deleteEnvelope,
        simulatePurchase,
        confirmPurchase,
        resetSimulation,
        startNewPeriod,
        shuffleEnvelopes,
        updateShuffleLimit,
        setShowShuffleScreen,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export const useBudget = () => {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}
