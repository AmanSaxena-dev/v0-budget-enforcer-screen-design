import { EnvelopeShuffle } from "@/components/EnvelopeShuffle"
import { StatusScreen } from "@/components/StatusScreen"
import { useBudget } from "@/context/budgetContext"
import { calculateStatus, formatCurrency, getStatusDetails } from "@/utils/budget-calculator"
import React from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Button } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

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

  if (showShuffleScreen) {
    return <EnvelopeShuffle onCancel={() => setShowShuffleScreen(false)} onComplete={resetSimulation} />
  }

  const currentStatus = calculateStatus(currentEnvelope)
  const currentStatusDetails = getStatusDetails(currentStatus.status)

  const dayInfo = `Day ${statusResult.currentDay} of ${statusResult.periodLength}`
  const currentSpendText = `Current spend: ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days`
  const tooltipText = `Note: You've currently spent ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days' worth of the money in this envelope`
  const purchaseText = currentPurchase
    ? `With this purchase: ${formatCurrency(currentPurchase.amount)}${currentPurchase.item ? ` on ${currentPurchase.item}` : ""}`
    : ""

  // Icon mapping
  const iconMap: Record<string, { name: string; color: string; size: number }> = {
    "check": { name: "check-circle", color: "#fff", size: 96 },
    "thumbs-up": { name: "thumb-up", color: "#22c55e", size: 96 },
    "alert-triangle": { name: "alert", color: "#f59e42", size: 96 },
    "thumbs-down": { name: "thumb-down", color: "#ef4444", size: 96 },
    "x-circle": { name: "close-circle", color: "#ef4444", size: 96 },
  }
  const smallIconMap: Record<string, { name: string; color: string; size: number }> = {
    "check": { name: "check-circle", color: "#fff", size: 32 },
    "thumbs-up": { name: "thumb-up", color: "#fff", size: 32 },
    "alert-triangle": { name: "alert", color: "#fff", size: 32 },
    "thumbs-down": { name: "thumb-down", color: "#fff", size: 32 },
    "x-circle": { name: "close-circle", color: "#fff", size: 32 },
  }

  const iconProps = iconMap[statusResult.statusIcon] || iconMap["check"]
  const icon = <Icon {...iconProps} style={styles.icon} />

  const currentStateIconProps = smallIconMap[currentStatusDetails.icon] || smallIconMap["check"]
  const currentStateIcon = <Icon {...currentStateIconProps} style={styles.icon} />

  // Subtext logic
  let subtext = ""
  const daysAfter = Math.round(statusResult.daysWorthAfterPurchase * 10) / 10
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

  const handleYesClick = () => {
    if (statusResult.status === "budget-breaker" || statusResult.status === "envelope-empty") {
      setShowShuffleScreen(true)
    } else {
      confirmPurchase()
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      {!currentPurchase && (
        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={resetSimulation}>
            Back to Home Screen
          </Button>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  icon: {
    alignSelf: "center",
  },
})