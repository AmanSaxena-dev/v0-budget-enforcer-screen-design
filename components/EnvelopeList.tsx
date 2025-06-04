import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native"
import { useBudget } from "../context/budget-context"
import { formatCurrency, formatDaysWorth } from "../utils/budget-calculator"
import { useNavigation } from "@react-navigation/native"
import { Feather } from "@expo/vector-icons"
import ProgressBar from "./ProgressBar"

export default function EnvelopeList() {
  const { envelopes, setCurrentEnvelope } = useBudget()
  const navigation = useNavigation()

  const handleAddEnvelope = () => {
    navigation.navigate("NewEnvelope" as never)
  }

  const renderEnvelope = ({ item: envelope }: any) => {
    const dailyAmount = envelope.allocation / envelope.periodLength
    const daysWorth = envelope.spent / dailyAmount
    const percentSpent = (envelope.spent / envelope.allocation) * 100

    // Determine progress bar color based on envelope status
    let progressColor = "#22c55e" // green-500
    if (envelope.color.includes("amber")) {
      progressColor = "#f59e0b" // amber-500
    } else if (envelope.color.includes("orange")) {
      progressColor = "#ea580c" // orange-600
    } else if (envelope.color.includes("red")) {
      progressColor = "#ef4444" // red-500
    }

    return (
      <TouchableOpacity
        style={[styles.envelopeCard, { borderColor: progressColor }]}
        onPress={() => setCurrentEnvelope(envelope)}
      >
        <View style={styles.envelopeContent}>
          {/* Left side: Envelope name and total */}
          <View style={styles.envelopeInfo}>
            <Text style={styles.envelopeName}>{envelope.name}</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>{formatCurrency(envelope.allocation)}</Text>
            </View>
          </View>

          {/* Right side: Progress bar and amounts */}
          <View style={styles.progressSection}>
            <ProgressBar progress={percentSpent} color={progressColor} />

            <View style={styles.amountsRow}>
              <View>
                <Text style={styles.amountText}>
                  {formatCurrency(envelope.spent)} <Text style={styles.daysText}>({formatDaysWorth(daysWorth)})</Text>
                </Text>
              </View>
              <View>
                <Text style={styles.amountText}>
                  {formatCurrency(envelope.allocation - envelope.spent)} <Text style={styles.daysText}>left</Text>
                </Text>
              </View>
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
        <TouchableOpacity style={styles.addButton} onPress={handleAddEnvelope}>
          <Feather name="plus-circle" size={16} color="#0284c7" />
          <Text style={styles.addButtonText}>New Envelope</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={envelopes}
        renderItem={renderEnvelope}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#0284c7",
  },
  list: {
    gap: 8,
  },
  envelopeCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    borderLeftWidth: 4,
  },
  envelopeContent: {
    flexDirection: "row",
  },
  envelopeInfo: {
    flex: 1,
  },
  envelopeName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  progressSection: {
    flex: 2,
    paddingLeft: 12,
  },
  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  amountText: {
    fontSize: 12,
    fontWeight: "500",
  },
  daysText: {
    color: "#666",
    fontWeight: "normal",
  },
})
