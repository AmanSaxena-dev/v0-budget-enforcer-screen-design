import type { Envelope, EnvelopeStatus } from "../types/budget"
import { differenceInDays } from "date-fns"

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function formatDaysWorth(days: number): string {
  const roundedDays = Math.round(days * 10) / 10
  return `${roundedDays} days`
}

export function calculateDaysWorth(envelope: Envelope): number {
  if (envelope.allocation <= 0) return 0

  const dailyAmount = envelope.allocation / envelope.periodLength
  if (dailyAmount <= 0) return 0

  return envelope.spent / dailyAmount
}

export function calculateStatus(envelope: Envelope): { status: EnvelopeStatus; daysWorth: number } {
  const daysWorth = calculateDaysWorth(envelope)
  const currentDay = getCurrentDay(envelope)

  // Calculate what percentage of the period has passed
  const percentOfPeriodPassed = (currentDay / envelope.periodLength) * 100

  // Calculate what percentage of the allocation has been spent
  const percentSpent = (envelope.spent / envelope.allocation) * 100

  // Determine status based on the relationship between these percentages
  let status: EnvelopeStatus

  if (envelope.spent >= envelope.allocation) {
    status = "envelope-empty"
  } else if (percentSpent <= percentOfPeriodPassed * 0.8) {
    status = "super-safe"
  } else if (percentSpent <= percentOfPeriodPassed * 0.9) {
    status = "safe"
  } else if (percentSpent <= percentOfPeriodPassed * 1.1) {
    status = "off-track"
  } else if (percentSpent <= percentOfPeriodPassed * 1.2) {
    status = "danger"
  } else {
    status = "budget-breaker"
  }

  return { status, daysWorth }
}

export function getCurrentDay(envelope: Envelope): number {
  const startDate = new Date(envelope.startDate)
  const today = new Date()
  const daysPassed = differenceInDays(today, startDate)
  return Math.max(1, Math.min(daysPassed + 1, envelope.periodLength))
}

export function getStatusDetails(status: EnvelopeStatus): {
  text: string
  color: string
  borderColor: string
  textColor: string
  icon: string
} {
  switch (status) {
    case "super-safe":
      return {
        text: "Super Safe",
        color: "rgb(34, 197, 94)", // green-500
        borderColor: "rgb(220, 252, 231)", // green-100
        textColor: "white",
        icon: "thumbs-up",
      }
    case "safe":
      return {
        text: "On Track",
        color: "rgb(34, 197, 94)", // green-500
        borderColor: "rgb(220, 252, 231)", // green-100
        textColor: "white",
        icon: "check",
      }
    case "off-track":
      return {
        text: "Off Track",
        color: "rgb(245, 158, 11)", // amber-500
        borderColor: "rgb(254, 243, 199)", // amber-100
        textColor: "white",
        icon: "alert-triangle",
      }
    case "danger":
      return {
        text: "Danger Zone",
        color: "rgb(249, 115, 22)", // orange-500
        borderColor: "rgb(255, 237, 213)", // orange-100
        textColor: "white",
        icon: "thumbs-down",
      }
    case "budget-breaker":
      return {
        text: "Budget Breaker",
        color: "rgb(239, 68, 68)", // red-500
        borderColor: "rgb(254, 226, 226)", // red-100
        textColor: "white",
        icon: "x-circle",
      }
    case "envelope-empty":
      return {
        text: "Envelope Empty",
        color: "rgb(239, 68, 68)", // red-500
        borderColor: "rgb(254, 226, 226)", // red-100
        textColor: "white",
        icon: "x-circle",
      }
    default:
      return {
        text: "Unknown",
        color: "rgb(107, 114, 128)", // gray-500
        borderColor: "rgb(243, 244, 246)", // gray-100
        textColor: "white",
        icon: "help-circle",
      }
  }
}
