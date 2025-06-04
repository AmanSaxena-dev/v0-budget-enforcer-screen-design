import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { format } from "date-fns"
import { useBudget } from "../context/BudgetContext"
import { calculateDayInPeriod } from "../utils/budgetCalculator"

export default function PeriodInfo() {
  const { currentPeriod } = useBudget()

  if (!currentPeriod) {
    return (
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={24} color="#007AFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>No Active Period</Text>
            <Text style={styles.subtitle}>Please set up your budget</Text>
          </View>
        </View>
      </View>
    )
  }

  const startDate = currentPeriod.startDate
  const endDate = currentPeriod.endDate
  const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const currentDay = calculateDayInPeriod(startDate, periodLength)

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={24} color="#007AFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Current Period</Text>
          <Text style={styles.subtitle}>
            {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}
          </Text>
        </View>
        <View style={styles.dayContainer}>
          <Text style={styles.dayNumber}>Day {currentDay}</Text>
          <Text style={styles.dayTotal}>of {periodLength}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  dayContainer: {
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  dayTotal: {
    fontSize: 12,
    color: "#666",
  },
})
