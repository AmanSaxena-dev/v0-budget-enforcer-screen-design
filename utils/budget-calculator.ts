import type { Envelope, Purchase, StatusResult, StatusType, EnvelopeStatus } from "../types/budget"

// Calculate the current day in the period
export function calculateDayInPeriod(startDate: Date, currentDate: Date = new Date()): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 because we count the first day

  return Math.max(1, Math.min(diffDays, 14)) // Ensure between 1 and 14
}

// Get status details based on status type
export function getStatusDetails(status: StatusType): EnvelopeStatus {
  switch (status) {
    case "super-safe":
      return {
        status,
        color: "#15803d", // green-700
        textColor: "#ffffff", // white
        borderColor: "#ffffff", // white
        icon: "check",
        text: "Super Safe",
      }
    case "safe":
      return {
        status,
        color: "#d1fae5", // green-100
        textColor: "#15803d", // green-700
        borderColor: "#22c55e", // green-500
        icon: "thumbs-up",
        text: "Safe",
      }
    case "off-track":
      return {
        status,
        color: "#fef3c7", // amber-100
        textColor: "#b45309", // amber-700
        borderColor: "#f59e0b", // amber-500
        icon: "alert-triangle",
        text: "Off Track (Caution)",
      }
    case "danger":
      return {
        status,
        color: "#fed7aa", // orange-200
        textColor: "#9a3412", // orange-800
        borderColor: "#ea580c", // orange-600
        icon: "alert-triangle",
        text: "Danger Zone",
      }
    case "envelope-empty":
      return {
        status,
        color: "#fee2e2", // red-100
        textColor: "#b91c1c", // red-700
        borderColor: "#ef4444", // red-500
        icon: "x-circle",
        text: "Envelope Empty",
      }
    default:
      return {
        status: "super-safe",
        color: "#15803d", // green-700
        textColor: "#ffffff", // white
        borderColor: "#ffffff", // white
        icon: "check",
        text: "Super Safe",
      }
  }
}

// Calculate envelope status
export function calculateEnvelopeStatus(envelope: Envelope): StatusType {
  const currentDay = calculateDayInPeriod(envelope.startDate)
  const dailyAmount = envelope.allocation / envelope.periodLength
  const expectedSpend = currentDay * dailyAmount
  const currentSpend = envelope.spent

  // Determine status based on current spend vs expected spend
  if (currentSpend >= envelope.allocation) {
    return "envelope-empty"
  } else if (currentSpend > 1.2 * expectedSpend) {
    return "danger"
  } else if (currentSpend > expectedSpend) {
    return "off-track"
  } else if (currentSpend >= 0.8 * expectedSpend) {
    return "safe"
  } else {
    return "super-safe"
  }
}

// Calculate status with potential purchase
export function calculateStatus(envelope: Envelope, purchase: Purchase | null = null): StatusResult {
  const currentDay = calculateDayInPeriod(envelope.startDate)
  const dailyAmount = envelope.allocation / envelope.periodLength
  const expectedSpend = currentDay * dailyAmount

  // Current spend in days worth
  const currentDaysWorth = envelope.spent / dailyAmount

  // Calculate remaining amount
  const remainingAmount = envelope.allocation - envelope.spent

  // Determine current status
  let status: StatusType = calculateEnvelopeStatus(envelope)
  let daysWorthAfterPurchase = currentDaysWorth

  // Calculate status after potential purchase
  if (purchase) {
    const totalSpendAfterPurchase = envelope.spent + purchase.amount
    daysWorthAfterPurchase = totalSpendAfterPurchase / dailyAmount

    // Recalculate status with the purchase
    if (totalSpendAfterPurchase >= envelope.allocation) {
      status = "envelope-empty"
    } else if (totalSpendAfterPurchase > 1.2 * expectedSpend) {
      status = "danger"
    } else if (totalSpendAfterPurchase > expectedSpend) {
      status = "off-track"
    } else if (totalSpendAfterPurchase >= 0.8 * expectedSpend) {
      status = "safe"
    } else {
      status = "super-safe"
    }
  }

  // Get status details
  const statusDetails = getStatusDetails(status)

  return {
    status,
    currentDay,
    periodLength: envelope.periodLength,
    currentSpend: envelope.spent,
    expectedSpend,
    dailyAmount,
    remainingAmount,
    purchase,
    daysWorthOfSpending: currentDaysWorth,
    daysWorthAfterPurchase,
    envelopeName: envelope.name,
    statusColor: statusDetails.color,
    statusBorderColor: statusDetails.borderColor,
    statusTextColor: statusDetails.textColor,
    statusText: statusDetails.text,
    statusIcon: statusDetails.icon,
  }
}

// Update envelope status colors
export function updateEnvelopeStatus(envelope: Envelope): Envelope {
  const status = calculateEnvelopeStatus(envelope)
  const statusDetails = getStatusDetails(status)

  return {
    ...envelope,
    color: statusDetails.color,
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format days worth of spending
export function formatDaysWorth(days: number): string {
  return `${days.toFixed(1)} days`
}
