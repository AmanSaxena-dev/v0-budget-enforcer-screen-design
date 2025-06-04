import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency, calculateStatus, getStatusDetails } from "../utils/budgetCalculator"

export default function BudgetStatusScreen() {
  const { statusResult, confirmPurchase, resetSimulation, currentPurchase, showStatusScreen, currentEnvelope } =
    useBudget()

  if (!statusResult || !showStatusScreen || !currentEnvelope) {
    return null
  }

  const currentStatus = calculateStatus(currentEnvelope)
  const currentStatusDetails = getStatusDetails(currentStatus.status)

  const dayInfo = `Day ${statusResult.currentDay} of ${statusResult.periodLength}`
  const currentSpendText = `Current spend: ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days`
  const purchaseText = currentPurchase
    ? `With this purchase: ${formatCurrency(currentPurchase.amount)}${currentPurchase.item ? ` on ${currentPurchase.item}` : ""}`
    : ""

  const getIconName = (iconType) => {
    switch (iconType) {
      case "checkmark-circle":
        return "checkmark-circle"
      case "thumbs-up":
        return "thumbs-up"
      case "warning":
        return "warning"
      case "thumbs-down":
        return "thumbs-down"
      case "close-circle":
        return "close-circle"
      default:
        return "checkmark-circle"
    }
  }

  let subtext = ""
  const daysAfter = Math.round(statusResult.daysWorthAfterPurchase * 10) / 10

  switch (statusResult.status) {
    case "super-safe":
    case "safe":
      subtext = `This purchase would keep you at ${daysAfter} days' worth of spending.`
      break
    case "off-track":
      subtext = `This purchase would bring you to ${daysAfter} days' worth of spending.`
      break
    case "danger":
      subtext = `This purchase would bring you to ${daysAfter} days' worth of spending.`
      break
    case "budget-breaker":
      subtext = `${statusResult.envelopeName} envelope only has ${formatCurrency(statusResult.remainingAmount)} left this period.`
      break
    case "envelope-empty":
      subtext = `This envelope is already empty.`
      break
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.dayInfo}>{dayInfo}</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.currentSection, { backgroundColor: currentStatusDetails.color }]}>
            <Text style={styles.sectionTitle}>Current State</Text>
            <View style={styles.iconContainer}>
              <Ionicons name={getIconName(currentStatusDetails.icon)} size={32} color="white" />
            </View>
            <Text style={styles.currentSpendText}>{currentSpendText}</Text>
          </View>

          <View style={[styles.resultSection, { backgroundColor: statusResult.statusColor }]}>
            {purchaseText && (
              <Text style={[styles.purchaseText, { color: statusResult.statusTextColor }]}>{purchaseText}</Text>
            )}

            <View style={styles.statusIconContainer}>
              <Ionicons name={getIconName(statusResult.statusIcon)} size={64} color={statusResult.statusTextColor} />
            </View>

            <Text style={[styles.statusText, { color: statusResult.statusTextColor }]}>{statusResult.statusText}</Text>

            {subtext && <Text style={[styles.subtext, { color: statusResult.statusTextColor }]}>{subtext}</Text>}

            {currentPurchase && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={confirmPurchase}>
                  <Text style={styles.buttonText}>Confirm Purchase</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetSimulation}>
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {!currentPurchase && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.backButton} onPress={resetSimulation}>
              <Text style={styles.backButtonText}>Back to Home Screen</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    backgroundColor: "#374151",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  dayInfo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flexDirection: "row",
    minHeight: 300,
  },
  currentSection: {
    flex: 2,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  resultSection: {
    flex: 3,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 24,
    marginBottom: 12,
  },
  currentSpendText: {
    fontSize: 12,
    color: "white",
    textAlign: "center",
  },
  purchaseText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  statusIconContainer: {
    padding: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    gap: 12,
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#22c55e",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#ef4444",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
  },
})
