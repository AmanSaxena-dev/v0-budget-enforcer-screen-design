"use client"

import { useBudget } from "@/context/budget-context"
import StatusScreen from "@/components/status-screen"
import { ThumbsUp, ThumbsDown, AlertTriangle, XCircle, Check } from "lucide-react"
import { formatCurrency, calculateStatus, getStatusDetails } from "@/utils/budget-calculator"
import { Button } from "@/components/ui/button"

export default function BudgetStatusScreen() {
  const { statusResult, confirmPurchase, resetSimulation, currentPurchase, showStatusScreen, currentEnvelope } =
    useBudget()

  if (!statusResult || !showStatusScreen || !currentEnvelope) {
    return null
  }

  // Calculate the current status (without the purchase)
  const currentStatus = calculateStatus(currentEnvelope)
  const currentStatusDetails = getStatusDetails(currentStatus.status)

  // Format the day info
  const dayInfo = `Day ${statusResult.currentDay} of ${statusResult.periodLength}`

  // Format the current spend
  const currentSpendText = `Current spend: ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days`

  // Calculate tooltip text
  const tooltipText = `Note: You've currently spent ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days' worth of the money in this envelope`

  // Purchase text
  const purchaseText = currentPurchase
    ? `With this purchase: ${formatCurrency(currentPurchase.amount)}${currentPurchase.item ? ` on ${currentPurchase.item}` : ""}`
    : ""

  // Get the appropriate icon based on status
  let icon
  switch (statusResult.statusIcon) {
    case "check":
      icon = <Check className="h-24 w-24 text-white" />
      break
    case "thumbs-up":
      icon = <ThumbsUp className="h-24 w-24 text-green-500" />
      break
    case "alert-triangle":
      icon = <AlertTriangle className="h-24 w-24 text-amber-500" />
      break
    case "thumbs-down":
      icon = <ThumbsDown className="h-24 w-24 text-red-500" />
      break
    case "x-circle":
      icon = <XCircle className="h-24 w-24 text-red-500" />
      break
    default:
      icon = <Check className="h-24 w-24 text-white" />
  }

  // Get the current state icon
  let currentStateIcon
  switch (currentStatusDetails.icon) {
    case "check":
      currentStateIcon = <Check className="h-8 w-8 text-white" />
      break
    case "thumbs-up":
      currentStateIcon = <ThumbsUp className="h-8 w-8 text-white" />
      break
    case "alert-triangle":
      currentStateIcon = <AlertTriangle className="h-8 w-8 text-white" />
      break
    case "thumbs-down":
      currentStateIcon = <ThumbsDown className="h-8 w-8 text-white" />
      break
    case "x-circle":
      currentStateIcon = <XCircle className="h-8 w-8 text-white" />
      break
    default:
      currentStateIcon = <Check className="h-8 w-8 text-white" />
  }

  // Determine subtext based on status
  let subtext = ""
  const daysAfter = Math.round(statusResult.daysWorthAfterPurchase * 10) / 10

  switch (statusResult.status) {
    case "super-safe":
    case "safe":
      subtext = `This purchase would keep you at ${daysAfter} days' worth of spending.`
      break
    case "off-track":
    case "danger":
      subtext = `This purchase would bring you to ${daysAfter} days' worth of spending.`
      break
    case "envelope-empty":
      subtext = `${statusResult.envelopeName} envelope only has ${formatCurrency(statusResult.remainingAmount)} left this period. Would you like to do an envelope shuffle to find the other ${formatCurrency(currentPurchase ? currentPurchase.amount - statusResult.remainingAmount : 0)} elsewhere?`
      break
  }

  return (
    <div className="space-y-4">
      <StatusScreen
        icon={icon}
        text={statusResult.statusText}
        color={statusResult.statusColor}
        borderColor={statusResult.statusBorderColor}
        textColor={statusResult.statusTextColor}
        topText={purchaseText}
        subtext={subtext}
        isDivided={true}
        dayInfo={dayInfo}
        currentSpend={currentSpendText}
        topBgColor={currentStatusDetails.color}
        topIcon={currentStateIcon}
        tooltipText={tooltipText}
        showActionButtons={!!currentPurchase}
        onYesClick={confirmPurchase}
        onNoClick={resetSimulation}
        showDivider={true}
        statusText="Current State"
        leftStatusText={currentStatusDetails.text}
      />

      <div className="flex justify-end">
        <Button variant="outline" onClick={resetSimulation}>
          Back to Home Screen
        </Button>
      </div>
    </div>
  )
}
