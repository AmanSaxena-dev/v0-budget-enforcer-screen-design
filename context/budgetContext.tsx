"use client"

import { useAuth } from "@/context/authContext"
import type {
  Bill,
  BillsEnvelope,
  Envelope,
  Period,
  Purchase,
  ShuffleAllocation,
  ShuffleLimit,
  ShuffleTransaction,
  StatusResult,
  UserPreferences,
} from "@/types/budget"
import { calculateNextPeriod, calculateStatus, updateEnvelopeStatus } from "@/utils/budget-calculator"
import AsyncStorage from '@react-native-async-storage/async-storage'
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Storage keys
const ENVELOPES_KEY = "budget_enforcer_envelopes"
const PURCHASES_KEY = "budget_enforcer_purchases"
const SHUFFLES_KEY = "budget_enforcer_shuffles"
const PERIODS_KEY = "budget_enforcer_periods"
const SHUFFLE_LIMITS_KEY = "budget_enforcer_shuffle_limits"

// Sample suggested envelopes (for new users)
export const suggestedEnvelopes = [
  {
    name: "Food",
    allocation: 420,
    periodLength: 14,
  },
  {
    name: "Entertainment",
    allocation: 210,
    periodLength: 14,
  },
  {
    name: "Transportation",
    allocation: 140,
    periodLength: 14,
  },
]

type PaycheckFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'

const periodsPerMonth: Record<PaycheckFrequency, number> = {
  weekly: 4,
  biweekly: 2,
  semimonthly: 2,
  monthly: 1
}

const periodsPerMonthDisplay: Record<PaycheckFrequency, string> = {
  weekly: '4',
  biweekly: '2',
  semimonthly: '2',
  monthly: '1'
}

interface PeriodPlan {
  envelopes: Omit<Envelope, "id" | "color" | "startDate">[]
  billsAllocation?: number
  savedAt?: string
}

interface BudgetContextType {
  envelopes: Envelope[]
  currentEnvelope: Envelope | null
  setCurrentEnvelope: (envelope: Envelope | null) => void
  statusResult: StatusResult | null
  simulatePurchase: (purchase: Omit<Purchase, "id" | "date">) => void
  resetSimulation: () => void
  confirmPurchase: () => void
  currentPurchase: Purchase | null
  addEnvelope: (envelope: Omit<Envelope, "id" | "color">) => void
  updateEnvelope: (id: string, updates: Partial<Envelope>) => void
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
  startNewPeriod: (
    startDate: Date,
    periodLength: number,
    envelopes: Omit<Envelope, "id" | "color" | "startDate">[],
    endDate?: Date, // Add optional end date parameter
    billsData?: {
      bills: Omit<Bill, "id" | "lastPaidDate">[]
      initialBalance: number
    },
  ) => void
  hasActiveBudget: boolean
  getNextPeriods: () => Promise<Array<{
    id: string
    startDate: Date
    endDate: Date
    periodLength: number
    isPlanned: boolean
    isCurrent?: boolean
  }>>
  savePeriodPlan: (periodId: string, plan: PeriodPlan) => Promise<void>
  getPeriodPlan: (periodId: string) => Promise<PeriodPlan | null>
  deletePeriodPlan: (periodId: string) => Promise<void>
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

        const [firstPayDay, secondPayDay] = userPreferences.semiMonthlyPayDays.sort((a: any, b: any) => a - b)
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

    // Debug logging to help diagnose issues
    console.log(`Period ${i + 1}:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      periodLength,
      paycheckFrequency: userPreferences.paycheckFrequency,
    })

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

  // Load data from localStorage when user changes
  useEffect(() => {
    if (!user?.id) return

    const loadData = async () => {
      try {
        // Load envelopes
        const envelopesJson = await AsyncStorage.getItem(`${ENVELOPES_KEY}_${userId}`)
        if (envelopesJson) {
          setEnvelopes(JSON.parse(envelopesJson))
        }

        // Load purchases
        const purchasesJson = await AsyncStorage.getItem(`${PURCHASES_KEY}_${userId}`)
        if (purchasesJson) {
          setPurchases(JSON.parse(purchasesJson))
        }

        // Load shuffle transactions
        const shufflesJson = await AsyncStorage.getItem(`${SHUFFLES_KEY}_${userId}`)
        if (shufflesJson) {
          setShuffleTransactions(JSON.parse(shufflesJson))
        }

        // Load periods
        const periodsJson = await AsyncStorage.getItem(`${PERIODS_KEY}_${userId}`)
        if (periodsJson) {
          setPeriods(JSON.parse(periodsJson))
        }

        // Load shuffle limits
        const limitsJson = await AsyncStorage.getItem(`${SHUFFLE_LIMITS_KEY}_${userId}`)
        if (limitsJson) {
          setShuffleLimits(JSON.parse(limitsJson))
        }

        // Load bills envelope
        const billsJson = await AsyncStorage.getItem(`budget_enforcer_bills_${userId}`)
        if (billsJson) {
          setBillsEnvelope(JSON.parse(billsJson))
        }
      } catch (error) {
        console.error('Error loading budget data:', error)
      }
    }

    loadData()
  }, [user?.id])

  // Save data to localStorage when it changes
  useEffect(() => {
    if (!user?.id) return

    const saveData = async () => {
      try {
        await AsyncStorage.setItem(`${ENVELOPES_KEY}_${userId}`, JSON.stringify(envelopes))
        await AsyncStorage.setItem(`${PURCHASES_KEY}_${userId}`, JSON.stringify(purchases))
        await AsyncStorage.setItem(`${SHUFFLES_KEY}_${userId}`, JSON.stringify(shuffleTransactions))
        await AsyncStorage.setItem(`${PERIODS_KEY}_${userId}`, JSON.stringify(periods))
        await AsyncStorage.setItem(`${SHUFFLE_LIMITS_KEY}_${userId}`, JSON.stringify(shuffleLimits))
        await AsyncStorage.setItem(`budget_enforcer_bills_${userId}`, JSON.stringify(billsEnvelope))
      } catch (error) {
        console.error('Error saving budget data:', error)
      }
    }

    saveData()
  }, [envelopes, purchases, shuffleTransactions, periods, shuffleLimits, billsEnvelope, user?.id])

  // Calculate initial status when current envelope changes
  useEffect(() => {
    if (currentEnvelope) {
      const result = calculateStatus(currentEnvelope)
      setStatusResult(result)
    }
  }, [currentEnvelope])

  // Simulate a purchase
  const simulatePurchase = (purchaseData: Omit<Purchase, "id" | "date">) => {
    if (currentEnvelope) {
      const purchase: Purchase = {
        ...purchaseData,
        id: `purchase_${Date.now()}`,
        date: new Date(),
      }

      setCurrentPurchase(purchase)
      const result = calculateStatus(currentEnvelope, purchase)
      setStatusResult(result)
      setShowStatusScreen(true)
    }
  }

  // Reset the simulation
  const resetSimulation = () => {
    if (currentEnvelope) {
      setCurrentPurchase(null)
      const result = calculateStatus(currentEnvelope)
      setStatusResult(result)
      setShowStatusScreen(false)
      setShowShuffleScreen(false)
    }
  }

  // Confirm the purchase
  const confirmPurchase = () => {
    if (currentEnvelope && currentPurchase) {
      // Add purchase to history
      const newPurchases = [...purchases, currentPurchase]
      setPurchases(newPurchases)

      // Update the envelope with the new spent amount
      const updatedEnvelopes = envelopes.map((env) => {
        if (env.id === currentEnvelope.id) {
          const updated = {
            ...env,
            spent: env.spent + currentPurchase.amount,
          }
          return updateEnvelopeStatus(updated)
        }
        return env
      })

      const updatedEnvelope = updatedEnvelopes.find((env) => env.id === currentEnvelope.id)!

      setEnvelopes(updatedEnvelopes)
      setCurrentEnvelope(updatedEnvelope)
      setCurrentPurchase(null)

      // Update current period transactions
      if (currentPeriod) {
        const updatedPeriods = periods.map((period) => {
          if (period.id === currentPeriod.id) {
            return {
              ...period,
              transactions: [...period.transactions, currentPurchase],
              envelopes: updatedEnvelopes,
            }
          }
          return period
        })
        setPeriods(updatedPeriods)
      }

      // Recalculate status
      const result = calculateStatus(updatedEnvelope)
      setStatusResult(result)
      setShowStatusScreen(false)
      setShowShuffleScreen(false)
    }
  }

  // Shuffle envelopes
  const shuffleEnvelopes = (targetEnvelopeId: string, purchase: Purchase, allocations: ShuffleAllocation[]) => {
    // Get the target envelope
    const targetEnvelope = envelopes.find((env) => env.id === targetEnvelopeId)
    if (!targetEnvelope || !purchase) return

    // Calculate how much we need to take from other envelopes
    const remaining = targetEnvelope.allocation - targetEnvelope.spent
    const amountNeeded = Math.max(0, purchase.amount - remaining)

    // Create shuffle transaction record
    const shuffleTransaction: ShuffleTransaction = {
      id: `shuffle_${Date.now()}`,
      date: new Date(),
      targetEnvelopeId,
      purchaseId: purchase.id,
      allocations,
    }

    // Add shuffle transaction to history
    const newShuffleTransactions = [...shuffleTransactions, shuffleTransaction]
    setShuffleTransactions(newShuffleTransactions)

    // Add purchase to history
    const newPurchases = [...purchases, purchase]
    setPurchases(newPurchases)

    // Update shuffle limits
    const newShuffleLimits = [...shuffleLimits]
    allocations.forEach((allocation) => {
      const limitIndex = newShuffleLimits.findIndex((limit) => limit.envelopeId === allocation.envelopeId)
      if (limitIndex >= 0) {
        newShuffleLimits[limitIndex] = {
          ...newShuffleLimits[limitIndex],
          currentShuffled: newShuffleLimits[limitIndex].currentShuffled + allocation.amount,
        }
      }
    })
    setShuffleLimits(newShuffleLimits)

    // Update all envelopes based on allocations
    const updatedEnvelopes = envelopes.map((env) => {
      // If this is the target envelope, increase its allocation
      if (env.id === targetEnvelopeId) {
        const updated = {
          ...env,
          allocation: env.allocation + amountNeeded,
          spent: env.spent + purchase.amount,
        }
        return updateEnvelopeStatus(updated)
      }

      // If this envelope is in the allocations, reduce its allocation
      const allocation = allocations.find((a) => a.envelopeId === env.id)
      if (allocation && allocation.amount > 0) {
        const updated = {
          ...env,
          allocation: env.allocation - allocation.amount,
        }
        return updateEnvelopeStatus(updated)
      }

      return env
    })

    const updatedEnvelope = updatedEnvelopes.find((env) => env.id === targetEnvelopeId)!

    setEnvelopes(updatedEnvelopes)
    setCurrentEnvelope(updatedEnvelope)
    setCurrentPurchase(null)

    // Update current period transactions and envelopes
    if (currentPeriod) {
      const updatedPeriods = periods.map((period) => {
        if (period.id === currentPeriod.id) {
          return {
            ...period,
            transactions: [...period.transactions, purchase, shuffleTransaction],
            envelopes: updatedEnvelopes,
          }
        }
        return period
      })
      setPeriods(updatedPeriods)
    }

    // Recalculate status
    const result = calculateStatus(updatedEnvelope)
    setStatusResult(result)
    setShowStatusScreen(false)
    setShowShuffleScreen(false)
  }

  // Add a new envelope
  const addEnvelope = (envelope: Omit<Envelope, "id" | "color">) => {
    const newEnvelope: Envelope = {
      ...envelope,
      id: `env_${Date.now()}`,
      color: "bg-green-100", // Default color, will be updated
    }

    const updatedEnvelope = updateEnvelopeStatus(newEnvelope)
    const newEnvelopes = [...envelopes, updatedEnvelope]
    setEnvelopes(newEnvelopes)
    setHasActiveBudget(true)

    // Add shuffle limit for the new envelope
    setShuffleLimits([
      ...shuffleLimits,
      {
        envelopeId: updatedEnvelope.id,
        maxAmount: updatedEnvelope.allocation * 0.2, // Default 20% limit
        currentShuffled: 0,
      },
    ])

    // Update current period envelopes
    if (currentPeriod) {
      const updatedPeriods = periods.map((period) => {
        if (period.id === currentPeriod.id) {
          return {
            ...period,
            envelopes: newEnvelopes,
          }
        }
        return period
      })
      setPeriods(updatedPeriods)
    }
  }

  // Update an envelope
  const updateEnvelope = (id: string, updates: Partial<Envelope>) => {
    const updatedEnvelopes = envelopes.map((env) => {
      if (env.id === id) {
        const updated = { ...env, ...updates }
        return updateEnvelopeStatus(updated)
      }
      return env
    })

    setEnvelopes(updatedEnvelopes)

    // Update current envelope if it's the one being updated
    if (currentEnvelope && currentEnvelope.id === id) {
      const updatedEnvelope = updatedEnvelopes.find((env) => env.id === id)!
      setCurrentEnvelope(updatedEnvelope)
    }

    // Update current period envelopes
    if (currentPeriod) {
      const updatedPeriods = periods.map((period) => {
        if (period.id === currentPeriod.id) {
          return {
            ...period,
            envelopes: updatedEnvelopes,
          }
        }
        return period
      })
      setPeriods(updatedPeriods)
    }
  }

  // Delete an envelope
  const deleteEnvelope = (id: string) => {
    const newEnvelopes = envelopes.filter((env) => env.id !== id)
    setEnvelopes(newEnvelopes)
    setHasActiveBudget(newEnvelopes.length > 0)

    // Remove shuffle limits for this envelope
    setShuffleLimits(shuffleLimits.filter((limit) => limit.envelopeId !== id))

    // Reset current envelope if it's the one being deleted
    if (currentEnvelope && currentEnvelope.id === id) {
      setCurrentEnvelope(null)
      setStatusResult(null)
    }

    // Update current period envelopes
    if (currentPeriod) {
      const updatedPeriods = periods.map((period) => {
        if (period.id === currentPeriod.id) {
          return {
            ...period,
            envelopes: newEnvelopes,
          }
        }
        return period
      })
      setPeriods(updatedPeriods)
    }
  }

  // Update shuffle limit for an envelope
  const updateShuffleLimit = (envelopeId: string, maxAmount: number) => {
    const limitIndex = shuffleLimits.findIndex((limit) => limit.envelopeId === envelopeId)

    if (limitIndex >= 0) {
      const newLimits = [...shuffleLimits]
      newLimits[limitIndex] = {
        ...newLimits[limitIndex],
        maxAmount,
      }
      setShuffleLimits(newLimits)
    } else {
      setShuffleLimits([
        ...shuffleLimits,
        {
          envelopeId,
          maxAmount,
          currentShuffled: 0,
        },
      ])
    }
  }

  // Start a new period
  const startNewPeriod = (
    startDate: Date,
    periodLength: number,
    envelopeData: Omit<Envelope, "id" | "color" | "startDate">[],
    providedEndDate?: Date,
    billsData?: {
      bills: Omit<Bill, "id" | "lastPaidDate">[]
      initialBalance: number
    },
  ) => {
    // Use provided end date or calculate it
    const endDate =
      providedEndDate ||
      (() => {
        const calculated = new Date(startDate)
        calculated.setDate(startDate.getDate() + periodLength - 1)
        calculated.setHours(23, 59, 59, 999)
        return calculated
      })()

    // Ensure end date is set to end of day
    if (!providedEndDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    // Create new envelopes for the period
    const newEnvelopes = envelopeData.map((envData) => {
      // Check if there's an existing envelope with the same name
      const existingEnvelope = envelopes.find((env) => env.name === envData.name)

      const newEnvelope: Envelope = {
        ...envData,
        id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startDate,
        color: "bg-green-100", // Will be updated
        // If there's an existing envelope, calculate previousRemaining
        previousRemaining: existingEnvelope ? Math.max(0, existingEnvelope.allocation - existingEnvelope.spent) : 0,
      }

      return updateEnvelopeStatus(newEnvelope)
    })

    // Create new period
    const newPeriod: Period = {
      id: `period_${Date.now()}`,
      startDate,
      endDate,
      envelopes: newEnvelopes,
      transactions: [],
    }

    // Add new period to periods
    setPeriods([...periods, newPeriod])

    // Update current envelopes
    setEnvelopes(newEnvelopes)
    setHasActiveBudget(true)

    // Reset current envelope
    setCurrentEnvelope(null)
    setStatusResult(null)

    // Reset shuffle limits
    const newShuffleLimits = newEnvelopes.map((env) => ({
      envelopeId: env.id,
      maxAmount: env.allocation * 0.2, // Default 20% limit
      currentShuffled: 0,
    }))
    setShuffleLimits(newShuffleLimits)

    // Set up bills envelope if bills data is provided
    if (billsData && billsData.bills.length > 0) {
      const newBills = billsData.bills.map((bill) => ({
        ...bill,
        id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        lastPaidDate: undefined,
      }))

      const totalMonthlyBills = newBills.reduce((sum, bill) => sum + bill.amount, 0)
      const cushionAmount = totalMonthlyBills * 0.15 // 15% cushion
      const targetAmount = totalMonthlyBills + cushionAmount
      const currentBalance = billsData.initialBalance

      // Calculate funding status
      const isFullyFunded = currentBalance >= totalMonthlyBills
      const hasReachedCushion = currentBalance >= targetAmount

      // Find next due bill
      const today = new Date()
      const upcomingBills = newBills
        .map((bill) => {
          const thisMonth = new Date(today.getFullYear(), today.getMonth(), bill.dueDay)
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, bill.dueDay)
          return {
            ...bill,
            dueDate: thisMonth >= today ? thisMonth : nextMonth,
          }
        })
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

      const nextDueDate = upcomingBills.length > 0 ? upcomingBills[0].dueDate : new Date()
      const nextDueAmount = upcomingBills.length > 0 ? upcomingBills[0].amount : 0

      // Calculate required per paycheck based on user preferences
      let requiredPerPaycheck = 0
      if (user?.preferences && !hasReachedCushion) {
        const amountNeeded = targetAmount - currentBalance

        // Calculate based on paycheck frequency
        switch (user.preferences.paycheckFrequency) {
          case "weekly":
            requiredPerPaycheck = totalMonthlyBills / 4.33 // Average weeks per month
            break
          case "biweekly":
            requiredPerPaycheck = totalMonthlyBills / 2.17 // Average biweekly periods per month
            break
          case "semimonthly":
            requiredPerPaycheck = totalMonthlyBills / 2
            break
          case "monthly":
            requiredPerPaycheck = totalMonthlyBills
            break
          default:
            requiredPerPaycheck = totalMonthlyBills / 2
        }

        // If we need more to reach target, adjust accordingly
        if (amountNeeded > 0) {
          // Add a portion of the needed amount to each paycheck
          const paychecksPerMonth = user.preferences.paycheckFrequency 
            ? periodsPerMonth[user.preferences.paycheckFrequency as PaycheckFrequency] 
            : 2

          requiredPerPaycheck += amountNeeded / (paychecksPerMonth * 2) // Spread over 2 months
        }
      }

      // Create the bills envelope
      const newBillsEnvelope: BillsEnvelope = {
        id: "bills_envelope",
        name: "Bills",
        totalMonthlyBills,
        cushionAmount,
        targetAmount,
        currentBalance,
        bills: newBills,
        nextDueDate,
        nextDueAmount,
        isFullyFunded,
        hasReachedCushion,
        requiredPerPaycheck,
      }

      setBillsEnvelope(newBillsEnvelope)
    }

    // Reset purchases and shuffle transactions
    // Note: We don't clear the history, but we do reset the current state
    setCurrentPurchase(null)
    setShowStatusScreen(false)
    setShowShuffleScreen(false)
  }

  // Get next periods based on user preferences
  const getNextPeriods = async () => {
    if (!user?.preferences || !currentPeriod) return []

    const nextPeriods = calculateNextPeriods(user.preferences, currentPeriod, 3)

    // Check which periods have saved plans
    const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
    const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

    // Check for regular period plan
    const regularPlanJson = await AsyncStorage.getItem(`budget_enforcer_regular_plan_${userId}`)
    const hasRegularPlan = !!regularPlanJson

    return nextPeriods.map((period) => ({
      ...period,
      isPlanned: !!savedPlans[period.id] || hasRegularPlan,
    }))
  }

  // Save a plan for a specific period
  const savePeriodPlan = async (periodId: string, plan: PeriodPlan) => {
    if (!user?.id) return

    const userId = user.id

    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      savedPlans[periodId] = {
        ...plan,
        savedAt: new Date().toISOString()
      }
      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error('Error saving period plan:', error)
    }
  }

  // Get a plan for a specific period
  const getPeriodPlan = async (periodId: string): Promise<PeriodPlan | null> => {
    if (!user?.id) return null

    const userId = user.id

    try {
      // First check for specific period plans
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      if (savedPlans[periodId]) {
        return savedPlans[periodId]
      }

      // If no specific regular period found, check for the default regular plan template
      const regularPlanJson = await AsyncStorage.getItem(`budget_enforcer_regular_plan_${userId}`)
      if (regularPlanJson) {
        const regularPlan = JSON.parse(regularPlanJson)
        return regularPlan
      }

      return null
    } catch (error) {
      console.error('Error getting period plan:', error)
      return null
    }
  }

  // Delete a plan for a specific period
  const deletePeriodPlan = async (periodId: string) => {
    if (!user?.id) return

    const userId = user.id

    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      delete savedPlans[periodId]
      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error('Error deleting period plan:', error)
    }
  }

  // Check if we should automatically start the next period
  const checkAndStartNextPeriod = async () => {
    if (!user?.preferences || !currentPeriod) return

    const now = new Date()
    const periodEndDate = new Date(currentPeriod.endDate)
    periodEndDate.setHours(23, 59, 59, 999)

    // Check if current period has ended
    if (now > periodEndDate) {
      try {
        // Look for a saved plan for the next period
        const nextPeriodStart = new Date(currentPeriod.endDate)
        nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)

        const nextPeriodId = `period_${nextPeriodStart.getTime()}`
        const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
        let savedPlans: Record<string, PeriodPlan> = {}
        
        if (savedPlansJson && typeof savedPlansJson === 'string' && savedPlansJson.trim().startsWith('{')) {
          try {
            savedPlans = JSON.parse(savedPlansJson)
          } catch (e) {
            console.error('Error parsing saved plans:', e)
            savedPlans = {}
          }
        }

        if (savedPlans[nextPeriodId]) {
          // We have a saved plan, use it to start the next period
          const plan = savedPlans[nextPeriodId]
          const nextPeriodLength = user.preferences.periodLength

          // Calculate the actual next period dates based on user preferences
          const { startDate, endDate, periodLength } = calculateNextPeriod(user.preferences, currentPeriod.endDate)

          startNewPeriod(
            startDate,
            periodLength,
            plan.envelopes.map((env: any) => ({
              ...env,
              periodLength,
            })),
          )

          // Remove the used plan
          delete savedPlans[nextPeriodId]
          await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
        }
      } catch (error) {
        console.error('Error in checkAndStartNextPeriod:', error)
      }
    }
  }

  // Calculate bills envelope metrics
  const calculateBillsMetrics = (bills: Bill[], currentBalance: number, userPreferences: UserPreferences | null) => {
    const totalMonthlyBills = bills.reduce((sum, bill) => sum + bill.amount, 0)

    // Calculate cushion: 15% of total monthly bills
    const cushionAmount = totalMonthlyBills * 0.15

    // Total target amount includes monthly bills plus cushion
    const targetAmount = totalMonthlyBills + cushionAmount

    // Check if we have reached the cushioned target
    const hasReachedCushion = currentBalance >= targetAmount
    const isFullyFunded = currentBalance >= totalMonthlyBills

    let requiredPerPaycheck = 0
    if (userPreferences && !hasReachedCushion) {
      // If we haven't reached cushion, calculate how much more we need
      const amountNeeded = targetAmount - currentBalance

      // Calculate based on next month's bills due date (simplified approach)
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const daysUntilNextMonth = Math.floor((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Calculate paychecks until end of month
      let paychecksUntilTarget = 1
      switch (userPreferences.paycheckFrequency) {
        case "weekly":
          paychecksUntilTarget = Math.max(1, Math.ceil(daysUntilNextMonth / 7))
          break
        case "biweekly":
          paychecksUntilTarget = Math.max(1, Math.ceil(daysUntilNextMonth / 14))
          break
        case "semimonthly":
          paychecksUntilTarget = Math.max(1, Math.ceil(daysUntilNextMonth / 15))
          break
        case "monthly":
          paychecksUntilTarget = 1
          break
      }

      // Required per paycheck to reach cushion target
      requiredPerPaycheck = Math.max(0, amountNeeded / paychecksUntilTarget)
    } else if (userPreferences && hasReachedCushion) {
      // Once cushioned, use maintenance amounts
      switch (userPreferences.paycheckFrequency) {
        case "weekly":
          requiredPerPaycheck = totalMonthlyBills / 4.33 // Average weeks per month
          break
        case "biweekly":
          requiredPerPaycheck = totalMonthlyBills / 2.17 // Average biweekly periods per month
          break
        case "semimonthly":
          requiredPerPaycheck = totalMonthlyBills / 2
          break
        case "monthly":
          requiredPerPaycheck = totalMonthlyBills
          break
        default:
          requiredPerPaycheck = totalMonthlyBills / 2
      }
    }

    // Find next due bill
    const today = new Date()
    const upcomingBills = bills
      .map((bill) => {
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), bill.dueDay)
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, bill.dueDay)
        return {
          ...bill,
          dueDate: thisMonth >= today ? thisMonth : nextMonth,
        }
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

    const nextDueDate = upcomingBills.length > 0 ? upcomingBills[0].dueDate : new Date()
    const nextDueAmount = upcomingBills.length > 0 ? upcomingBills[0].amount : 0

    return {
      totalMonthlyBills,
      cushionAmount,
      targetAmount,
      hasReachedCushion,
      isFullyFunded,
      requiredPerPaycheck,
      nextDueDate,
      nextDueAmount,
    }
  }

  // Add a bill
  const addBill = (billData: Omit<Bill, "id">) => {
    if (!billsEnvelope) return

    const newBill: Bill = {
      ...billData,
      id: `bill_${Date.now()}`,
    }

    const updatedBills = [...billsEnvelope.bills, newBill]
    const metrics = calculateBillsMetrics(updatedBills, billsEnvelope.currentBalance, user?.preferences || null)

    setBillsEnvelope({
      ...billsEnvelope,
      bills: updatedBills,
      ...metrics,
    })
  }

  // Update a bill
  const updateBill = (id: string, updates: Partial<Bill>) => {
    if (!billsEnvelope) return

    const updatedBills = billsEnvelope.bills.map((bill: any) => (bill.id === id ? { ...bill, ...updates } : bill))

    const metrics = calculateBillsMetrics(updatedBills, billsEnvelope.currentBalance, user?.preferences || null)

    setBillsEnvelope({
      ...billsEnvelope,
      bills: updatedBills,
      ...metrics,
    })
  }

  // Delete a bill
  const deleteBill = (id: string) => {
    if (!billsEnvelope) return

    const updatedBills = billsEnvelope.bills.filter((bill: any) => bill.id !== id)
    const metrics = calculateBillsMetrics(updatedBills, billsEnvelope.currentBalance, user?.preferences || null)

    setBillsEnvelope({
      ...billsEnvelope,
      bills: updatedBills,
      ...metrics,
    })
  }

  // Add money to bills envelope
  const addMoneyToBills = (amount: number) => {
    if (!billsEnvelope) return

    const newBalance = billsEnvelope.currentBalance + amount
    const metrics = calculateBillsMetrics(billsEnvelope.bills, newBalance, user?.preferences || null)

    setBillsEnvelope({
      ...billsEnvelope,
      currentBalance: newBalance,
      ...metrics,
    })
  }

  // Pay a bill
  const payBill = (billId: string) => {
    if (!billsEnvelope) return

    const bill = billsEnvelope.bills.find((b: any) => b.id === billId)
    if (!bill || billsEnvelope.currentBalance < bill.amount) return

    const newBalance = billsEnvelope.currentBalance - bill.amount
    const updatedBills = billsEnvelope.bills.map((b: any) => (b.id === billId ? { ...b, lastPaidDate: new Date() } : b))

    const metrics = calculateBillsMetrics(updatedBills, newBalance, user?.preferences || null)

    setBillsEnvelope({
      ...billsEnvelope,
      currentBalance: newBalance,
      bills: updatedBills,
      ...metrics,
    })
  }

  // Add this useEffect to check for period transitions
  useEffect(() => {
    const interval = setInterval(checkAndStartNextPeriod, 60000) // Check every minute
    checkAndStartNextPeriod() // Check immediately

    return () => clearInterval(interval)
  }, [user, currentPeriod, userId])

  const loadRegularPeriodPlan = async (periodStart: Date) => {
    if (!user?.id) return null

    const userId = user.id
    const periodId = `period_${periodStart.getTime()}`

    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      if (!savedPlansJson) return null

      const savedPlans = JSON.parse(savedPlansJson)
      return savedPlans[periodId] || null
    } catch (error) {
      console.error('Error loading regular period plan:', error)
      return null
    }
  }

  const loadDefaultRegularPlan = async () => {
    if (!user?.id) return null

    const userId = user.id

    try {
      const regularPlanJson = await AsyncStorage.getItem(`budget_enforcer_regular_plan_${userId}`)
      return regularPlanJson ? JSON.parse(regularPlanJson) : null
    } catch (error) {
      console.error('Error loading default regular plan:', error)
      return null
    }
  }

  const saveRegularPeriodPlan = async (periodStart: Date, plan: any) => {
    if (!user?.id) return

    const userId = user.id
    const periodId = `period_${periodStart.getTime()}`

    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      savedPlans[periodId] = plan
      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error('Error saving regular period plan:', error)
    }
  }

  const saveDefaultRegularPlan = async (plan: any) => {
    if (!user?.id) return

    const userId = user.id

    try {
      await AsyncStorage.setItem(`budget_enforcer_regular_plan_${userId}`, JSON.stringify(plan))
    } catch (error) {
      console.error('Error saving default regular plan:', error)
    }
  }

  const deleteRegularPeriodPlan = async (periodStart: Date) => {
    if (!user?.id) return

    const userId = user.id
    const periodId = `period_${periodStart.getTime()}`

    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      if (!savedPlansJson) return

      const savedPlans = JSON.parse(savedPlansJson)
      delete savedPlans[periodId]
      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error('Error deleting regular period plan:', error)
    }
  }

  return (
    <BudgetContext.Provider
      value={{
        envelopes,
        currentEnvelope,
        setCurrentEnvelope,
        statusResult,
        simulatePurchase,
        resetSimulation,
        confirmPurchase,
        currentPurchase,
        addEnvelope,
        updateEnvelope,
        deleteEnvelope,
        showStatusScreen,
        setShowStatusScreen,
        showShuffleScreen,
        setShowShuffleScreen,
        shuffleEnvelopes,
        purchases,
        shuffleTransactions,
        periods,
        currentPeriod,
        shuffleLimits,
        updateShuffleLimit,
        startNewPeriod,
        hasActiveBudget,
        getNextPeriods,
        savePeriodPlan,
        getPeriodPlan,
        deletePeriodPlan,
        billsEnvelope,
        addBill,
        updateBill,
        deleteBill,
        addMoneyToBills,
        payBill,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}
