"use client"

import { useBudget } from "@/context/budget-context"
import StatusScreen from "@/components/status-screen"
import { EnvelopeShuffle } from "@/components/envelope-shuffle"
import { ThumbsUp, ThumbsDown, AlertTriangle, XCircle, Check } from "lucide-react"
import { formatCurrency, calculateStatus, getStatusDetails } from "@/utils/budget-calculator"
import { Button } from "@/components/ui/button"

export default function BudgetStatusScreen() {
  const {
    statusResult,
    confirmPurchase,
    resetSimulation,
    currentPurchase,
    showStatusScreen,
    currentEnvelope,
    showShuffleScreen,
    setShowShuffleScreen,
  } = useBudget()

  if (!statusResult || !showStatusScreen || !currentEnvelope) {
    return null
  }

  // If we're showing the shuffle screen, render the envelope shuffle component
  if (showShuffleScreen) {
    return <EnvelopeShuffle onCancel={() => setShowShuffleScreen(false)} onComplete={resetSimulation} />
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

  // Check if this purchase would exactly use up the allocation
  const wouldExactlyUseUpAllocation =
    currentPurchase &&
    statusResult.remainingAmount > 0 &&
    Math.abs(currentPurchase.amount - statusResult.remainingAmount) < 0.01

  switch (statusResult.status) {
    case "super-safe":
    case "safe":
      subtext = `This purchase would keep you at ${daysAfter} days' worth of spending.`
      break
    case "off-track":
      subtext = `This purchase would bring you to ${daysAfter} days' worth of spending.`
      break
    case "danger":
      if (wouldExactlyUseUpAllocation) {
        subtext = `This purchase would use up exactly all the money in your ${statusResult.envelopeName} envelope.`
      } else {
        subtext = `This purchase would bring you to ${daysAfter} days' worth of spending.`
      }
      break
    case "budget-breaker":
      subtext = `${statusResult.envelopeName} envelope only has ${formatCurrency(statusResult.remainingAmount)} left this period. Would you like to do an envelope shuffle to find the other ${formatCurrency(currentPurchase ? currentPurchase.amount - statusResult.remainingAmount : 0)} elsewhere?`
      break
    case "envelope-empty":
      subtext = `This envelope is already empty. Would you like to pull the ${formatCurrency(currentPurchase ? currentPurchase.amount : 0)} from another envelope?`
      break
  }

  // Handle the "Yes" button click for budget-breaker or envelope-empty status
  const handleYesClick = () => {
    if (statusResult.status === "budget-breaker" || statusResult.status === "envelope-empty") {
      setShowShuffleScreen(true)
    } else {
      confirmPurchase()
    }
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
        onYesClick={handleYesClick}
        onNoClick={resetSimulation}
        showDivider={true}
        statusText="Current State"
        leftStatusText={currentStatusDetails.text}
        status={statusResult.status}
      />

      <div className="flex justify-end">
        {!currentPurchase && (
          <Button variant="outline" onClick={resetSimulation}>
            Back to Home Screen
          </Button>
        )}
      </div>
    </div>
  )
}
