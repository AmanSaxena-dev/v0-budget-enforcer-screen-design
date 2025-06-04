import { View, Text, StyleSheet } from "react-native"
import { useBudget } from "../context/budget-context"
import { format } from "date-fns"
import { calculateDayInPeriod } from "../utils/budget-calculator"

export default function PeriodInfo() {
  const { envelopes } = useBudget()

  // Use the first envelope to get period info, or default to current date
  const startDate = envelopes.length > 0 ? envelopes[0].startDate : new Date()
  const periodLength = envelopes.length > 0 ? envelopes[0].periodLength : 14

  // Calculate end date
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + periodLength - 1)

  // Calculate current day in period
  const currentDay = calculateDayInPeriod(startDate)

  // Format dates
  const formattedStartDate = format(startDate, "MMMM d, yyyy")
  const formattedEndDate = format(endDate, "MMMM d, yyyy")
  const formattedCurrentDate = format(new Date(), "MMMM d, yyyy")

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View>
          <Text style={styles.heading}>Current Period</Text>
          <Text style={styles.subtext}>
            {formattedStartDate} to {formattedEndDate}
          </Text>
        </View>
        <View style={styles.todaySection}>
          <Text style={styles.heading}>Today</Text>
          <Text style={styles.subtext}>
            {formattedCurrentDate} <Text style={styles.day}>(Day {currentDay})</Text>
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginBottom: 16,
  },
  content: {
    padding: 16,
  },
  heading: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
  },
  todaySection: {
    marginTop: 12,
  },
  day: {
    fontWeight: "500",
  },
})
