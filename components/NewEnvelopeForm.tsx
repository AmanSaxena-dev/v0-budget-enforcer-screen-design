"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"

interface NewEnvelopeFormProps {
  onComplete: () => void
}

export function NewEnvelopeForm({ onComplete }: NewEnvelopeFormProps) {
  const { addEnvelope } = useBudget()
  const [name, setName] = useState("")
  const [allocation, setAllocation] = useState("")
  const [periodLength, setPeriodLength] = useState("14")
  const [startDate, setStartDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleSubmit = () => {
    if (name && allocation && periodLength) {
      addEnvelope({
        name,
        allocation: Number.parseFloat(allocation),
        periodLength: Number.parseInt(periodLength),
        startDate,
        spent: 0,
      })

      onComplete()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onComplete}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Envelope</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Envelope Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g., Food, Entertainment" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Allocation Amount ($)</Text>
          <TextInput
            style={styles.input}
            value={allocation}
            onChangeText={setAllocation}
            placeholder="e.g., 420"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Period Length (days)</Text>
          <TextInput
            style={styles.input}
            value={periodLength}
            onChangeText={setPeriodLength}
            placeholder="e.g., 14"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateButtonText}>{startDate.toLocaleDateString()}</Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === "ios")
                if (selectedDate) {
                  const localDate = new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth(),
                    selectedDate.getDate(),
                  )
                  setStartDate(localDate)
                }
              }}
            />
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onComplete}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, (!name || !allocation || !periodLength) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!name || !allocation || !periodLength}
          >
            <Text style={styles.createButtonText}>Create Envelope</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  form: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  createButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
