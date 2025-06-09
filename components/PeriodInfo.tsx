import { View, Text, StyleSheet } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { Ionicons } from "@expo/vector-icons"
import { calculateDayInPeriod } from "@/utils/budget-calculator"

export function PeriodInfo() {
  const { currentPeriod } = useBudget()

  if (!currentPeriod) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar" size={24} color="#007AFF" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>No Active Period</Text>
              <Text style={styles.subtitle}>Please set up your budget</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const startDate = currentPeriod.startDate
  const endDate = currentPeriod.endDate
  const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const currentDay = calculateDayInPeriod(startDate, periodLength)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar" size={24} color="#007AFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Current Period</Text>
            <Text style={styles.subtitle}>
              {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.dayContainer}>
            <Text style={styles.dayNumber}>Day {currentDay}</Text>
            <Text style={styles.dayTotal}>of {periodLength}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 0,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
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
    backgroundColor: "#f5f5f5",
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
