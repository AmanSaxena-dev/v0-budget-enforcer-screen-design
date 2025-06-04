"use client"

import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "./AuthContext"
import { calculateStatus, updateEnvelopeStatus } from "../utils/budgetCalculator"

const BudgetContext = createContext()

const ENVELOPES_KEY = "budget_enforcer_envelopes"
const PURCHASES_KEY = "budget_enforcer_purchases"
const PERIODS_KEY = "budget_enforcer_periods"

export function BudgetProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id || "guest"

  const [envelopes, setEnvelopes] = useState([])
  const [purchases, setPurchases] = useState([])
  const [periods, setPeriods] = useState([])
  const [hasActiveBudget, setHasActiveBudget] = useState(false)

  const [currentEnvelope, setCurrentEnvelope] = useState(null)
  const [statusResult, setStatusResult] = useState(null)
  const [currentPurchase, setCurrentPurchase] = useState(null)
  const [showStatusScreen, setShowStatusScreen] = useState(false)

  const currentPeriod = periods.length > 0 ? periods[periods.length - 1] : null

  useEffect(() => {
    loadData()
  }, [userId])

  useEffect(() => {
    if (user) {
      saveData()
    }
  }, [user, envelopes, purchases, periods])

  const loadData = async () => {
    try {
      const envelopesJson = await AsyncStorage.getItem(`${ENVELOPES_KEY}_${userId}`)
      if (envelopesJson) {
        const loadedEnvelopes = JSON.parse(envelopesJson).map((env) => ({
          ...env,
          startDate: new Date(env.startDate),
        }))
        setEnvelopes(loadedEnvelopes.map(updateEnvelopeStatus))
        setHasActiveBudget(loadedEnvelopes.length > 0)
      }

      const purchasesJson = await AsyncStorage.getItem(`${PURCHASES_KEY}_${userId}`)
      if (purchasesJson) {
        const loadedPurchases = JSON.parse(purchasesJson).map((purchase) => ({
          ...purchase,
          date: new Date(purchase.date),
        }))
        setPurchases(loadedPurchases)
      }

      const periodsJson = await AsyncStorage.getItem(`${PERIODS_KEY}_${userId}`)
      if (periodsJson) {
        const loadedPeriods = JSON.parse(periodsJson).map((period) => ({
          ...period,
          startDate: new Date(period.startDate),
          endDate: new Date(period.endDate),
        }))
        setPeriods(loadedPeriods)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const saveData = async () => {
    try {
      await AsyncStorage.setItem(`${ENVELOPES_KEY}_${userId}`, JSON.stringify(envelopes))
      await AsyncStorage.setItem(`${PURCHASES_KEY}_${userId}`, JSON.stringify(purchases))
      await AsyncStorage.setItem(`${PERIODS_KEY}_${userId}`, JSON.stringify(periods))
    } catch (error) {
      console.error("Error saving data:", error)
    }
  }

  const simulatePurchase = (purchaseData) => {
    if (currentEnvelope) {
      const purchase = {
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

  const resetSimulation = () => {
    if (currentEnvelope) {
      setCurrentPurchase(null)
      const result = calculateStatus(currentEnvelope)
      setStatusResult(result)
      setShowStatusScreen(false)
    }
  }

  const confirmPurchase = () => {
    if (currentEnvelope && currentPurchase) {
      const newPurchases = [...purchases, currentPurchase]
      setPurchases(newPurchases)

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

      const updatedEnvelope = updatedEnvelopes.find((env) => env.id === currentEnvelope.id)
      setEnvelopes(updatedEnvelopes)
      setCurrentEnvelope(updatedEnvelope)
      setCurrentPurchase(null)

      const result = calculateStatus(updatedEnvelope)
      setStatusResult(result)
      setShowStatusScreen(false)
    }
  }

  const addEnvelope = (envelope) => {
    const newEnvelope = {
      ...envelope,
      id: `env_${Date.now()}`,
      color: "bg-green-100",
    }

    const updatedEnvelope = updateEnvelopeStatus(newEnvelope)
    const newEnvelopes = [...envelopes, updatedEnvelope]
    setEnvelopes(newEnvelopes)
    setHasActiveBudget(true)
  }

  const startNewPeriod = (startDate, periodLength, envelopeData, providedEndDate) => {
    const endDate =
      providedEndDate ||
      (() => {
        const calculated = new Date(startDate)
        calculated.setDate(startDate.getDate() + periodLength - 1)
        calculated.setHours(23, 59, 59, 999)
        return calculated
      })()

    const newEnvelopes = envelopeData.map((envData) => {
      const newEnvelope = {
        ...envData,
        id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startDate,
        color: "bg-green-100",
      }
      return updateEnvelopeStatus(newEnvelope)
    })

    const newPeriod = {
      id: `period_${Date.now()}`,
      startDate,
      endDate,
      envelopes: newEnvelopes,
      transactions: [],
    }

    setPeriods([...periods, newPeriod])
    setEnvelopes(newEnvelopes)
    setHasActiveBudget(true)
    setCurrentEnvelope(null)
    setStatusResult(null)
    setCurrentPurchase(null)
    setShowStatusScreen(false)
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
        showStatusScreen,
        setShowStatusScreen,
        purchases,
        periods,
        currentPeriod,
        startNewPeriod,
        hasActiveBudget,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}
