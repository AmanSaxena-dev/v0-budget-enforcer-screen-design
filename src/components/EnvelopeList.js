import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency, formatDaysWorth } from "../utils/budgetCalculator"

export default function EnvelopeList() {
  const { envelopes, setCurrentEnvelope } = useBudget()

  const renderEnvelope = ({ item: envelope }) => {
    const dailyAmount = envelope.allocation / envelope.periodLength
    const daysWorth = envelope.spent / dailyAmount
    const percentSpent = (envelope.spent / envelope.allocation) * 100

    const getProgressColor = () => {
      if (envelope.color.includes("red")) return "#ef4444"
      if (envelope.color.includes("orange")) return "#f97316"
      if (envelope.color.includes("amber")) return "#f59e0b"
      return "#22c55e"
    }

    const getBorderColor = () => {
      if (envelope.color.includes("red")) return "#fecaca"
      if (envelope.color.includes("orange")) return "#fed7aa"
      if (envelope.color.includes("amber")) return "#fef3c7"
      return "#dcfce7"
    }

    return (
      <TouchableOpacity
        style={[styles.envelopeCard, { borderColor: getBorderColor() }]}
        onPress={() => setCurrentEnvelope(envelope)}
      >
        <View style={styles.envelopeHeader}>
          <View style={styles.envelopeInfo}>
            <Text style={styles.envelopeName}>{envelope.name}</Text>
            <Text style={styles.envelopeTotal}>Total: {formatCurrency(envelope.allocation)}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percentSpent, 100)}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>

          <View style={styles.progressLabels}>
            <View style={styles.spentInfo}>
              <Text style={styles.spentAmount}>{formatCurrency(envelope.spent)}</Text>
              <Text style={styles.spentDays}>({formatDaysWorth(daysWorth)})</Text>
            </View>
            <View style={styles.remainingInfo}>
              <Text style={styles.remainingAmount}>{formatCurrency(envelope.allocation - envelope.spent)}</Text>
              <Text style={styles.remainingLabel}>left</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Envelopes</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={envelopes}
        renderItem={renderEnvelope}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    gap: 12,
  },
  envelopeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  envelopeHeader: {
    marginBottom: 12,
  },
  envelopeInfo: {
    flex: 1,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  envelopeTotal: {
    fontSize: 14,
    color: "#666",
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  spentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spentAmount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  spentDays: {
    fontSize: 12,
    color: "#666",
  },
  remainingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  remainingAmount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  remainingLabel: {
    fontSize: 12,
    color: "#666",
  },
})
