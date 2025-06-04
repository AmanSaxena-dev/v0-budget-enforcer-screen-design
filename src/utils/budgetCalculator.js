export function calculateDayInPeriod(startDate, periodLength, currentDate = new Date()) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

  return Math.max(1, Math.min(diffDays, periodLength))
}

export function getStatusDetails(status) {
  switch (status) {
    case "super-safe":
      return {
        status,
        color: "#22c55e",
        textColor: "#ffffff",
        borderColor: "#ffffff",
        icon: "checkmark-circle",
        text: "Super Safe",
      }
    case "safe":
      return {
        status,
        color: "#dcfce7",
        textColor: "#15803d",
        borderColor: "#22c55e",
        icon: "thumbs-up",
        text: "Safe",
      }
    case "off-track":
      return {
        status,
        color: "#fef3c7",
        textColor: "#b45309",
        borderColor: "#f59e0b",
        icon: "warning",
        text: "Off Track (Caution)",
      }
    case "danger":
      return {
        status,
        color: "#fed7aa",
        textColor: "#c2410c",
        borderColor: "#ea580c",
        icon: "warning",
        text: "Danger Zone",
      }
    case "budget-breaker":
      return {
        status,
        color: "#fecaca",
        textColor: "#dc2626",
        borderColor: "#ef4444",
        icon: "thumbs-down",
        text: "Budget Breaker",
      }
    case "envelope-empty":
      return {
        status,
        color: "#fecaca",
        textColor: "#dc2626",
        borderColor: "#ef4444",
        icon: "close-circle",
        text: "Envelope Empty",
      }
    default:
      return {
        status: "super-safe",
        color: "#22c55e",
        textColor: "#ffffff",
        borderColor: "#ffffff",
        icon: "checkmark-circle",
        text: "Super Safe",
      }
  }
}

export function calculateEnvelopeStatus(envelope) {
  const currentDay = calculateDayInPeriod(envelope.startDate, envelope.periodLength)
  const dailyAmount = envelope.allocation / envelope.periodLength
  const expectedSpend = currentDay * dailyAmount
  const currentSpend = envelope.spent

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

export function calculateStatus(envelope, purchase = null) {
  const currentDay = calculateDayInPeriod(envelope.startDate, envelope.periodLength)
  const dailyAmount = envelope.allocation / envelope.periodLength
  const expectedSpend = currentDay * dailyAmount
  const currentDaysWorth = envelope.spent / dailyAmount
  const remainingAmount = envelope.allocation - envelope.spent
  const isCurrentlyEmpty = envelope.spent >= envelope.allocation

  let status = calculateEnvelopeStatus(envelope)
  let daysWorthAfterPurchase = currentDaysWorth

  if (purchase) {
    const totalSpendAfterPurchase = envelope.spent + purchase.amount
    daysWorthAfterPurchase = totalSpendAfterPurchase / dailyAmount

    if (isCurrentlyEmpty) {
      status = "envelope-empty"
    } else if (totalSpendAfterPurchase > envelope.allocation) {
      status = "budget-breaker"
    } else if (totalSpendAfterPurchase === envelope.allocation) {
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

export function updateEnvelopeStatus(envelope) {
  const status = calculateEnvelopeStatus(envelope)
  const statusDetails = getStatusDetails(status)

  return {
    ...envelope,
    color: statusDetails.color,
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDaysWorth(days) {
  return `${days.toFixed(1)} days`
}
