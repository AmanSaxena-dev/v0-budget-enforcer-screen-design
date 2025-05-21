"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Envelope, Purchase, StatusResult } from "@/types/budget"
import { calculateStatus, updateEnvelopeStatus } from "@/utils/budget-calculator"

// Sample initial data
const initialEnvelopes: Envelope[] = [
  {
    id: "food",
    name: "Food",
    allocation: 420,
    spent: 90, // 3 days worth at $30/day
    periodLength: 14,
    startDate: new Date(new Date().setDate(new Date().getDate() - 4)), // 5 days ago
    color: "bg-green-100",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    allocation: 210,
    spent: 45,
    periodLength: 14,
    startDate: new Date(new Date().setDate(new Date().getDate() - 4)),
    color: "bg-green-100",
  },
  {
    id: "transportation",
    name: "Transportation",
    allocation: 140,
    spent: 30,
    periodLength: 14,
    startDate: new Date(new Date().setDate(new Date().getDate() - 4)),
    color: "bg-green-100",
  },
]

interface BudgetContextType {
  envelopes: Envelope[]
  currentEnvelope: Envelope | null
  setCurrentEnvelope: (envelope: Envelope | null) => void
  statusResult: StatusResult | null
  simulatePurchase: (purchase: Purchase) => void
  resetSimulation: () => void
  confirmPurchase: () => void
  currentPurchase: Purchase | null
  addEnvelope: (envelope: Omit<Envelope, "id" | "color">) => void
  updateEnvelope: (id: string, updates: Partial<Envelope>) => void
  deleteEnvelope: (id: string) => void
  showStatusScreen: boolean
  setShowStatusScreen: (show: boolean) => void
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [envelopes, setEnvelopes] = useState<Envelope[]>(() => {
    // Update initial envelope colors
    return initialEnvelopes.map(updateEnvelopeStatus)
  })
  const [currentEnvelope, setCurrentEnvelope] = useState<Envelope | null>(null)
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null)
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null)
  const [showStatusScreen, setShowStatusScreen] = useState(false)

  // Update envelope statuses when component mounts
  useEffect(() => {
    const updatedEnvelopes = envelopes.map(updateEnvelopeStatus)
    setEnvelopes(updatedEnvelopes)
  }, [])

  // Calculate initial status when current envelope changes
  useEffect(() => {
    if (currentEnvelope) {
      const result = calculateStatus(currentEnvelope)
      setStatusResult(result)
    }
  }, [currentEnvelope])

  // Simulate a purchase
  const simulatePurchase = (purchase: Purchase) => {
    if (currentEnvelope) {
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
    }
  }

  // Confirm the purchase
  const confirmPurchase = () => {
    if (currentEnvelope && currentPurchase) {
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

      // Recalculate status
      const result = calculateStatus(updatedEnvelope)
      setStatusResult(result)
      setShowStatusScreen(false)
    }
  }

  // Add a new envelope
  const addEnvelope = (envelope: Omit<Envelope, "id" | "color">) => {
    const newEnvelope: Envelope = {
      ...envelope,
      id: `env-${Date.now()}`,
      color: "bg-green-100", // Default color, will be updated
    }

    const updatedEnvelope = updateEnvelopeStatus(newEnvelope)
    setEnvelopes([...envelopes, updatedEnvelope])
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
  }

  // Delete an envelope
  const deleteEnvelope = (id: string) => {
    setEnvelopes(envelopes.filter((env) => env.id !== id))

    // Reset current envelope if it's the one being deleted
    if (currentEnvelope && currentEnvelope.id === id) {
      setCurrentEnvelope(null)
      setStatusResult(null)
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
