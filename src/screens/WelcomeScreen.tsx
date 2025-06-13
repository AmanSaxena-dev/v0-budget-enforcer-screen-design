"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { useBudget, suggestedEnvelopes } from "../context/BudgetContext"
import { formatCurrency } from "../utils/budgetCalculator"

export default function WelcomeScreen({ navigation }) {
  const { startNewPeriod } = useBudget()
  const [startDate, setStartDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [periodLength, setPeriodLength] = useState("14")
  const [plannedEnvelopes, setPlannedEnvelopes] = useState(() =>
    suggestedEnvelopes.map((env) => ({
      name: env.name,
      allocation: env.allocation,
      spent: 0,
      periodLength: Number.parseInt(periodLength),
    })),
  )

  const handleAddEnvelope = () => {
    setPlannedEnvelopes([
      ...plannedEnvelopes,
      {
        name: "",
        allocation: 0,
        spent: 0,
        periodLength: Number.parseInt(periodLength),
      },
    ])
  }

  const handleRemoveEnvelope = (index) => {
    setPlannedEnvelopes(plannedEnvelopes.filter((_, i) => i !== index))
  }

  const handleEnvelopeChange = (index, field, value) => {
    const newEnvelopes = [...plannedEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setPlannedEnvelopes(newEnvelopes)
  }

  const handleCreateBudget = () => {
    // Validate inputs
    if (plannedEnvelopes.some((env) => !env.name || env.allocation <= 0)) {
      Alert.alert("Error", "Please fill in all envelope names and allocations")
      return
    }

    const periodLengthNum = Number.parseInt(periodLength)
    if (isNaN(periodLengthNum) || periodLengthNum <= 0) {
      Alert.alert("Error", "Please enter a valid period length")
      return
    }

    // Start new period
    startNewPeriod(
      startDate,
      periodLengthNum,
      plannedEnvelopes.map((env) => ({
        ...env,
        periodLength: periodLengthNum,
      })),
    )
  }

  // Calculate total budget
  const totalBudget = plannedEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate
    setShowDatePicker(false)
    setStartDate(currentDate)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Budget Enforcer!</Text>
          <Text style={styles.subtitle}>
            Let's set up your first budget. We've added some suggested envelopes to get you started.
          </Text>

          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color="#3b82f6" style={styles.dateIcon} />
                  <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker value={startDate} mode="date" display="default" onChange={onDateChange} />
                )}
              </View>

              <View style={styles.column}>
                <Text style={styles.label}>Period Length (days)</Text>
                <TextInput
                  style={styles.input}
                  value={periodLength}
                  onChangeText={setPeriodLength}
                  keyboardType="number-pad"
                  placeholder="14"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Envelopes</Text>
              <Text style={styles.totalText}>Total: {formatCurrency(totalBudget)}</Text>
            </View>

            {plannedEnvelopes.map((envelope, index) => (
              <View key={index} style={styles.envelopeRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="Envelope name"
                  value={envelope.name}
                  onChangeText={(text) => handleEnvelopeChange(index, "name", text)}
                />
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="Amount"
                  value={envelope.allocation.toString()}
                  onChangeText={(text) => handleEnvelopeChange(index, "allocation", text)}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveEnvelope(index)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={handleAddEnvelope}>
              <Ionicons name="add" size={20} color="#3b82f6" style={styles.addIcon} />
              <Text style={styles.addText}>Add Envelope</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateBudget}>
          <Ionicons name="arrow-forward" size={20} color="white" style={styles.createIcon} />
          <Text style={styles.createText}>Create My Budget</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#334155",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 10,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalText: {
    fontSize: 14,
    fontWeight: "600",
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  nameInput: {
    flex: 5,
  },
  amountInput: {
    flex: 3,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  addIcon: {
    marginRight: 8,
  },
  addText: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    padding: 14,
    marginTop: 8,
  },
  createIcon: {
    marginRight: 8,
  },
  createText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
})
