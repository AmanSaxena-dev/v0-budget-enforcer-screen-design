import type { Envelope, Purchase, StatusResult, StatusType, EnvelopeStatus, UserPreferences } from "../types/budget"

// Calculate the current day in the period with proper bounds checking
export function calculateDayInPeriod(startDate: Date, periodLength: number, currentDate: Date = new Date()): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 because we count the first day

  // Ensure the day never exceeds the period length
  return Math.max(1, Math.min(diffDays, periodLength))
}

// Check if a period has ended
export function isPeriodEnded(startDate: Date, periodLength: number, currentDate: Date = new Date()): boolean {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(6, 0, 0, 0) // Check at 6am

  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays >= periodLength
}

// Calculate the next period start and end dates based on user preferences
export function calculateNextPeriod(
  userPreferences: UserPreferences,
  currentPeriodEnd: Date,
): { startDate: Date; endDate: Date; periodLength: number } {
  const startDate = new Date(currentPeriodEnd)
  startDate.setDate(currentPeriodEnd.getDate() + 1) // Start the day after current period ends
  startDate.setHours(0, 0, 0, 0)

  let endDate: Date
  let periodLength: number

  switch (userPreferences.paycheckFrequency) {
    case "monthly":
      // For monthly, use the day from nextPayday
      const nextPaydayDay = userPreferences.nextPayday.getDate()

      // Find the next occurrence of the pay day
      const nextMonth = new Date(startDate)

      // If we're already past the pay day in the current month, move to next month
      if (startDate.getDate() > nextPaydayDay) {
        nextMonth.setMonth(nextMonth.getMonth() + 1)
      }

      // Set to the pay day
      nextMonth.setDate(nextPaydayDay)

      // If we ended up with a date before our start date, move to the next month
      if (nextMonth < startDate) {
        nextMonth.setMonth(nextMonth.getMonth() + 1)
      }

      // End date is the day before the next pay day
      endDate = new Date(nextMonth)
      endDate.setDate(endDate.getDate() - 1)
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

      if (currentDay < firstPayDay) {
        // Next pay is the first pay day of the current month
        nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth(), firstPayDay)
      } else if (currentDay < secondPayDay) {
        // Next pay is the second pay day of the current month
        nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth(), secondPayDay)
      } else {
        // Next pay is the first pay day of the next month
        nextPayDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, firstPayDay)
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

  return { startDate, endDate, periodLength }
}

// Calculate the next period start date (6am the day after period ends)
export function calculateNextPeriodStart(startDate: Date, periodLength: number): Date {
  const nextStart = new Date(startDate)
  nextStart.setDate(startDate.getDate() + periodLength)
  nextStart.setHours(0, 0, 0, 0)
  return nextStart
}

// Check if it's time to start a new period (midnight on the day after period ends)
export function shouldStartNewPeriod(startDate: Date, periodLength: number, currentDate: Date = new Date()): boolean {
  const nextPeriodStart = calculateNextPeriodStart(startDate, periodLength)
  return currentDate >= nextPeriodStart
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
        color: "#dcfce7", // green-100
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
    case "budget-breaker":
      return {
        status,
        color: "#fee2e2", // red-100
        textColor: "#b91c1c", // red-700
        borderColor: "#ef4444", // red-500
        icon: "thumbs-down",
        text: "Budget Breaker",
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
  const currentDay = calculateDayInPeriod(envelope.startDate, envelope.periodLength)
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
  const currentDay = calculateDayInPeriod(envelope.startDate, envelope.periodLength)
  const dailyAmount = envelope.allocation / envelope.periodLength
  const expectedSpend = currentDay * dailyAmount

  // Current spend in days worth
  const currentDaysWorth = envelope.spent / dailyAmount

  // Calculate remaining amount
  const remainingAmount = envelope.allocation - envelope.spent

  // Check if envelope is currently empty
  const isCurrentlyEmpty = envelope.spent >= envelope.allocation

  // Determine current status
  let status: StatusType = calculateEnvelopeStatus(envelope)
  let daysWorthAfterPurchase = currentDaysWorth

  // Calculate status after potential purchase
  if (purchase) {
    const totalSpendAfterPurchase = envelope.spent + purchase.amount
    daysWorthAfterPurchase = totalSpendAfterPurchase / dailyAmount

    // Recalculate status with the purchase
    if (isCurrentlyEmpty) {
      // If already empty, stay as envelope-empty
      status = "envelope-empty"
    } else if (totalSpendAfterPurchase > envelope.allocation) {
      // If not empty but purchase would exceed allocation, it's a budget breaker
      status = "budget-breaker"
    } else if (totalSpendAfterPurchase === envelope.allocation) {
      // If purchase would exactly use up the allocation, it's danger zone
      status = "danger"
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
    isCurrentlyEmpty,
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
