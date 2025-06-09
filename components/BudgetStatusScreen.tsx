import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { StatusScreen } from "./StatusScreen"
import { EnvelopeShuffle } from "./EnvelopeShuffle"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency, calculateStatus, getStatusDetails } from "@/utils/budget-calculator"

export function BudgetStatusScreen() {
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
    return (
      <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
        <EnvelopeShuffle onCancel={() => setShowShuffleScreen(false)} onComplete={resetSimulation} />
      </Modal>
    )
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
  let iconName: keyof typeof Ionicons.glyphMap
  switch (statusResult.statusIcon) {
    case "check":
      iconName = "checkmark"
      break
    case "thumbs-up":
      iconName = "thumbs-up"
      break
    case "alert-triangle":
      iconName = "warning"
      break
    case "thumbs-down":
      iconName = "thumbs-down"
      break
    case "x-circle":
      iconName = "close-circle"
      break
    default:
      iconName = "checkmark"
  }

  // Get the current state icon
  let currentStateIconName: keyof typeof Ionicons.glyphMap
  switch (currentStatusDetails.icon) {
    case "check":
      currentStateIconName = "checkmark"
      break
    case "thumbs-up":
      currentStateIconName = "thumbs-up"
      break
    case "alert-triangle":
      currentStateIconName = "warning"
      break
    case "thumbs-down":
      currentStateIconName = "thumbs-down"
      break
    case "x-circle":
      currentStateIconName = "close-circle"
      break
    default:
      currentStateIconName = "checkmark"
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
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <StatusScreen
          icon={<Ionicons name={iconName} size={96} color="white" />}
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
          topIcon={<Ionicons name={currentStateIconName} size={32} color="white" />}
          tooltipText={tooltipText}
          showActionButtons={!!currentPurchase}
          onYesClick={handleYesClick}
          onNoClick={resetSimulation}
          showDivider={true}
          statusText="Current State"
          leftStatusText={currentStatusDetails.text}
          status={statusResult.status}
        />

        <View style={styles.buttonContainer}>
          {!currentPurchase && (
            <TouchableOpacity style={styles.backButton} onPress={resetSimulation}>
              <Text style={styles.backButtonText}>Back to Home Screen</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  buttonContainer: {
    padding: 16,
    alignItems: "flex-end",
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
  },
})
