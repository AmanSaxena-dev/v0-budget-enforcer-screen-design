"use client"

import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAuth } from "./AuthContext"
import { calculateBudgetStatus } from "../utils/budgetCalculator"

const BudgetContext = createContext()

export const useBudget = () => {
  const context = useContext(BudgetContext)
  if (!context) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}

export const BudgetProvider = ({ children }) => {
  const { user } = useAuth()
  const [budgetData, setBudgetData] = useState({
    envelopes: [],
    transactions: [],
    currentPeriod: null,
    shuffleLimits: {
      daily: 3,
      weekly: 10,
      monthly: 30,
    },
    shuffleHistory: [],
  })

  const [hasActiveBudget, setHasActiveBudget] = useState(false)

  useEffect(() => {
    if (user) {
      loadBudgetData()
    }
  }, [user])

  const loadBudgetData = async () => {
    try {
      const data = await AsyncStorage.getItem("budgetData")
      if (data) {
        const parsedData = JSON.parse(data)
        setBudgetData(parsedData)
        setHasActiveBudget(parsedData.envelopes.length > 0)
      }
    } catch (error) {
      console.error("Error loading budget data:", error)
    }
  }

  const saveBudgetData = async (data) => {
    try {
      await AsyncStorage.setItem("budgetData", JSON.stringify(data))
      setBudgetData(data)
      setHasActiveBudget(data.envelopes.length > 0)
    } catch (error) {
      console.error("Error saving budget data:", error)
    }
  }

  const createBudget = async (envelopes, periodInfo) => {
    const newBudgetData = {
      ...budgetData,
      envelopes: envelopes.map((env) => ({
        ...env,
        id: Math.random().toString(36).substr(2, 9),
        currentAmount: env.budgetAmount,
        spent: 0,
      })),
      currentPeriod: periodInfo,
    }

    await saveBudgetData(newBudgetData)
  }

  const addTransaction = async (transaction) => {
    const newTransaction = {
      ...transaction,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    }

    const updatedEnvelopes = budgetData.envelopes.map((env) => {
      if (env.id === transaction.envelopeId) {
        return {
          ...env,
          currentAmount: env.currentAmount - transaction.amount,
          spent: env.spent + transaction.amount,
        }
      }
      return env
    })

    const newBudgetData = {
      ...budgetData,
      envelopes: updatedEnvelopes,
      transactions: [...budgetData.transactions, newTransaction],
    }

    await saveBudgetData(newBudgetData)
  }

  const shuffleFunds = async (fromEnvelopeId, toEnvelopeId, amount) => {
    const shuffleRecord = {
      id: Math.random().toString(36).substr(2, 9),
      fromEnvelopeId,
      toEnvelopeId,
      amount,
      timestamp: new Date().toISOString(),
    }

    const updatedEnvelopes = budgetData.envelopes.map((env) => {
      if (env.id === fromEnvelopeId) {
        return { ...env, currentAmount: env.currentAmount - amount }
      }
      if (env.id === toEnvelopeId) {
        return { ...env, currentAmount: env.currentAmount + amount }
      }
      return env
    })

    const newBudgetData = {
      ...budgetData,
      envelopes: updatedEnvelopes,
      shuffleHistory: [...budgetData.shuffleHistory, shuffleRecord],
    }

    await saveBudgetData(newBudgetData)
  }

  const getBudgetStatus = () => {
    return calculateBudgetStatus(budgetData.envelopes)
  }

  const value = {
    budgetData,
    hasActiveBudget,
    createBudget,
    addTransaction,
    shuffleFunds,
    getBudgetStatus,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}
