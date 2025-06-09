"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
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
} from "@/types/budget"
import { calculateStatus, updateEnvelopeStatus } from "@/utils/budget-calculator"
import { useAuth } from "@/context/authContext"

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
    endDate?: Date,
  ) => void
  hasActiveBudget: boolean
  getNextPeriods: () => Array<{
    id: string
    startDate: Date
    endDate: Date
    periodLength: number
    isPlanned: boolean
    isCurrent?: boolean
  }>
  savePeriodPlan: (periodId: string, envelopes: Omit<Envelope, "id" | "color" | "startDate">[]) => void
  getPeriodPlan: (periodId: string) => Omit<Envelope, "id" | "color" | "startDate">[] | null
  deletePeriodPlan: (periodId: string) => void
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
    const actualPeriodLength =
      Math.ceil((currentPeriod.endDate.getTime() - currentPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

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
    nextStart.setHours(6, 0, 0, 0)
    count = count - 1 // We already added the current period
  } else {
    // If no current period, start from the next paycheck date
    nextStart = new Date(userPreferences.nextPayday)
    nextStart.setHours(6, 0, 0, 0)
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
        periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
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
        periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
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
    nextStart.setHours(6, 0, 0, 0)
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
      } catch (error) {
        console.error("Error saving data:", error)
      }
    }

    saveData()
  }, [user, userId, envelopes, purchases, shuffleTransactions, periods, shuffleLimits])

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
  const confirmPurchase = async () => {
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
  const shuffleEnvelopes = async (targetEnvelopeId: string, purchase: Purchase, allocations: ShuffleAllocation[]) => {
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
  const addEnvelope = async (envelope: Omit<Envelope, "id" | "color">) => {
    const newEnvelope: Envelope = {
      ...envelope,
      id: `env_${Date.now()}`,
      color: "#dcfce7", // Default color, will be updated
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
  const updateEnvelope = async (id: string, updates: Partial<Envelope>) => {
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
  const deleteEnvelope = async (id: string) => {
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
  const updateShuffleLimit = async (envelopeId: string, maxAmount: number) => {
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
  const startNewPeriod = async (
    startDate: Date,
    periodLength: number,
    envelopeData: Omit<Envelope, "id" | "color" | "startDate">[],
    providedEndDate?: Date,
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
        color: "#dcfce7", // Will be updated
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

    // Reset purchases and shuffle transactions
    // Note: We don't clear the history, but we do reset the current state
    setCurrentPurchase(null)
    setShowStatusScreen(false)
    setShowShuffleScreen(false)
  }

  // Get next periods based on user preferences
  const getNextPeriods = () => {
    if (!user?.preferences) return []

    const nextPeriods = calculateNextPeriods(user.preferences, currentPeriod, 3)

    // Check which periods have saved plans
    const checkSavedPlans = async () => {
      try {
        const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
        const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

        return nextPeriods.map((period) => ({
          ...period,
          isPlanned: period.isCurrent || !!savedPlans[period.id],
        }))
      } catch (error) {
        console.error("Error checking saved plans:", error)
        return nextPeriods
      }
    }

    // For now, return without async check - this could be improved
    return nextPeriods
  }

  // Save a plan for a specific period
  const savePeriodPlan = async (periodId: string, envelopes: Omit<Envelope, "id" | "color" | "startDate">[]) => {
    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      savedPlans[periodId] = {
        envelopes,
        savedAt: new Date().toISOString(),
      }

      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error("Error saving period plan:", error)
    }
  }

  // Get a plan for a specific period
  const getPeriodPlan = async (periodId: string): Promise<Omit<Envelope, "id" | "color" | "startDate">[] | null> => {
    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      return savedPlans[periodId]?.envelopes || null
    } catch (error) {
      console.error("Error getting period plan:", error)
      return null
    }
  }

  // Delete a plan for a specific period
  const deletePeriodPlan = async (periodId: string) => {
    try {
      const savedPlansJson = await AsyncStorage.getItem(`budget_enforcer_period_plans_${userId}`)
      const savedPlans = savedPlansJson ? JSON.parse(savedPlansJson) : {}

      delete savedPlans[periodId]

      await AsyncStorage.setItem(`budget_enforcer_period_plans_${userId}`, JSON.stringify(savedPlans))
    } catch (error) {
      console.error("Error deleting period plan:", error)
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
