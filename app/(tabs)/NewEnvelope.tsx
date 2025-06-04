"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from "react-native"
import { useBudget } from "../../context/budget-context"
import { useNavigation } from "@react-navigation/native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { format } from "date-fns"
import { SafeAreaView } from "react-native-safe-area-context"

export default function NewEnvelope() {
  const { addEnvelope } = useBudget()
  const navigation = useNavigation()

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

      navigation.goBack()
    }
  }

  const onDateChange = (event: any, selectedDate: any) => {
    const currentDate = selectedDate || startDate
    setShowDatePicker(false)
    setStartDate(currentDate)
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Envelope Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Food, Entertainment"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Allocation Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={allocation}
              onChangeText={setAllocation}
              placeholder="e.g., 420"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Period Length (days)</Text>
            <TextInput
              style={styles.input}
              value={periodLength}
              onChangeText={setPeriodLength}
              placeholder="e.g., 14"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>{format(startDate, "MMMM d, yyyy")}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker value={startDate} mode="date" display="default" onChange={onDateChange} />
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, (!name || !allocation || !periodLength) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!name || !allocation || !periodLength}
            >
              <Text style={styles.submitButtonText}>Create Envelope</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "white",
  },
  dateButtonText: {
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748b",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#0284c7",
    padding: 12,
    borderRadius: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
})
