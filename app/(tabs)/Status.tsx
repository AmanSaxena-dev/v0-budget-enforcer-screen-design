import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useBudget } from "../../context/budget-context"
import { formatCurrency } from "../../utils/budget-calculator"
import { Feather } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function Status() {
  const { statusResult, confirmPurchase, resetSimulation, currentPurchase, currentEnvelope } = useBudget()
  const navigation = useNavigation()

  if (!statusResult || !currentEnvelope) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No status information available</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // Format the day info
  const dayInfo = `Day ${statusResult.currentDay} of ${statusResult.periodLength}`

  // Format the current spend
  const currentSpendText = `Current spend: ${Math.round(statusResult.daysWorthOfSpending * 10) / 10} days`

  // Purchase text
  const purchaseText = currentPurchase
    ? `With this purchase: ${formatCurrency(currentPurchase.amount)}${currentPurchase.item ? ` on ${currentPurchase.item}` : ""}`
    : ""

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

  // Get the appropriate icon based on status
  let icon
  switch (statusResult.statusIcon) {
    case "check":
      icon = <Feather name="check" size={48} color="white" />
      break
    case "thumbs-up":
      icon = <Feather name="thumbs-up" size={48} color="#22c55e" />
      break
    case "alert-triangle":
      icon = <Feather name="alert-triangle" size={48} color="#f59e0b" />
      break
    case "thumbs-down":
      icon = <Feather name="thumbs-down" size={48} color="#ef4444" />
      break
    case "x-circle":
      icon = <Feather name="x-circle" size={48} color="#ef4444" />
      break
    default:
      icon = <Feather name="check" size={48} color="white" />
  }

  const handleConfirm = () => {
    confirmPurchase()
    navigation.goBack()
  }

  const handleCancel = () => {
    resetSimulation()
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerText}>{dayInfo}</Text>
        </View>

        <View style={styles.content}>
          {/* Current State Section */}
          <View style={[styles.currentState, { backgroundColor: statusResult.statusColor }]}>
            <Text style={styles.stateTitle}>Current State</Text>
            <View style={styles.iconContainer}>
              <Feather name="check" size={24} color="white" />
            </View>
            <Text style={styles.stateText}>{currentSpendText}</Text>
          </View>

          {/* Status Section */}
          <View style={[styles.statusSection, { backgroundColor: statusResult.statusColor }]}>
            {purchaseText ? (
              <Text style={[styles.purchaseText, { color: statusResult.statusTextColor }]}>{purchaseText}</Text>
            ) : null}

            <View style={[styles.iconCircle, { borderColor: statusResult.statusBorderColor }]}>{icon}</View>

            <Text style={[styles.statusText, { color: statusResult.statusTextColor }]}>{statusResult.statusText}</Text>

            {subtext ? (
              <Text style={[styles.subtextStyle, { color: statusResult.statusTextColor }]}>{subtext}</Text>
            ) : null}

            {currentPurchase && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Yes</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>No</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Text style={styles.backButtonText}>Back to Home Screen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#1e293b",
    padding: 12,
    alignItems: "center",
  },
  headerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  currentState: {
    padding: 20,
    alignItems: "center",
  },
  stateTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stateText: {
    color: "white",
    fontSize: 14,
  },
  statusSection: {
    padding: 24,
    alignItems: "center",
    minHeight: 300,
  },
  purchaseText: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 24,
    textAlign: "center",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtextStyle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 24,
    gap: 16,
  },
  confirmButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  cancelButtonText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    padding: 16,
    alignItems: "flex-end",
  },
  backButton: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748b",
  },
  backButtonText: {
    color: "#64748b",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 24,
    color: "#64748b",
  },
})
