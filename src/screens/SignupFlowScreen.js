"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { format, differenceInDays } from "date-fns"
import { useAuth } from "../context/AuthContext"
import { formatCurrency } from "../utils/budgetCalculator"

export default function SignupFlowScreen() {
  const { updateUserPreferences } = useAuth()
  const [step, setStep] = useState(1)
  const [paycheckFrequency, setPaycheckFrequency] = useState("")
  const [nextPayday, setNextPayday] = useState("")
  const [paycheckAmount, setPaycheckAmount] = useState("")

  const today = new Date()

  const calculatePeriodSetup = () => {
    if (!nextPayday || !paycheckFrequency) return null

    const paydayDate = new Date(nextPayday)
    const daysUntilPayday = differenceInDays(paydayDate, today)
    let periodLength = 14

    switch (paycheckFrequency) {
      case "weekly":
        periodLength = 7
        break
      case "biweekly":
        periodLength = 14
        break
      case "monthly":
        const nextMonth = new Date(paydayDate)
        nextMonth.setMonth(paydayDate.getMonth() + 1)
        periodLength = Math.ceil((nextMonth.getTime() - paydayDate.getTime()) / (1000 * 60 * 60 * 24))
        break
    }

    const firstPeriodStart = today
    const firstPeriodLength = daysUntilPayday > 0 ? daysUntilPayday : 1

    return {
      firstPeriodStart,
      firstPeriodLength,
      periodLength,
    }
  }

  const handleNext = () => {
    if (step === 1 && paycheckFrequency) {
      setStep(2)
    } else if (step === 2 && nextPayday && paycheckAmount) {
      setStep(3)
    }
  }

  const handleComplete = () => {
    if (nextPayday && paycheckFrequency && paycheckAmount) {
      const setup = calculatePeriodSetup()
      if (setup) {
        updateUserPreferences({
          periodLength: setup.periodLength,
          firstPeriodStart: setup.firstPeriodStart,
          firstPeriodLength: setup.firstPeriodLength,
          nextPayday: new Date(nextPayday),
          paycheckAmount: Number.parseFloat(paycheckAmount),
          paycheckFrequency,
          autoCreatePeriods: true,
        })
      }
    }
  }

  const setup = calculatePeriodSetup()

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Paycheck Setup</Text>

          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>How often do you get paid?</Text>
              <View style={styles.optionsContainer}>
                {[
                  { value: "weekly", label: "Weekly" },
                  { value: "biweekly", label: "Every 2 weeks" },
                  { value: "monthly", label: "Monthly" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.option, paycheckFrequency === option.value && styles.selectedOption]}
                    onPress={() => setPaycheckFrequency(option.value)}
                  >
                    <View style={styles.radioButton}>
                      {paycheckFrequency === option.value && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Paycheck Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>When is your next payday?</Text>
                <TextInput
                  style={styles.input}
                  value={nextPayday}
                  onChangeText={setNextPayday}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>How much is your paycheck? (after taxes)</Text>
                <TextInput
                  style={styles.input}
                  value={paycheckAmount}
                  onChangeText={setPaycheckAmount}
                  placeholder="e.g., 2500"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}

          {step === 3 && setup && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Your Budget Schedule</Text>
              <View style={styles.scheduleContainer}>
                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleTitle}>Sync Period (Starting Today)</Text>
                  <Text style={styles.scheduleDate}>
                    {format(setup.firstPeriodStart, "MMM d")} - {format(new Date(nextPayday), "MMM d, yyyy")} (
                    {setup.firstPeriodLength} days)
                  </Text>
                  <Text style={styles.scheduleDescription}>
                    This period will sync your budget with your paycheck schedule.
                  </Text>
                </View>

                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleTitle}>First Full Period</Text>
                  <Text style={styles.scheduleDate}>Starting {format(new Date(nextPayday), "MMM d, yyyy")}</Text>
                  <Text style={styles.scheduleDescription}>
                    Your regular {setup.periodLength}-day budget periods will start here.
                  </Text>
                </View>

                <View style={styles.paycheckInfo}>
                  <Text style={styles.paycheckText}>
                    <Text style={styles.bold}>Paycheck:</Text>{" "}
                    {formatCurrency(Number.parseFloat(paycheckAmount || "0"))} every{" "}
                    {paycheckFrequency === "biweekly" ? "2 weeks" : paycheckFrequency}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  ((step === 1 && !paycheckFrequency) || (step === 2 && (!nextPayday || !paycheckAmount))) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={(step === 1 && !paycheckFrequency) || (step === 2 && (!nextPayday || !paycheckAmount))}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={handleComplete}>
                <Text style={styles.nextButtonText}>Continue to Budget Setup</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            )}
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
    color: "#333",
  },
  stepContainer: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    color: "#333",
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedOption: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  scheduleContainer: {
    gap: 16,
  },
  scheduleItem: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  scheduleDate: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
  },
  scheduleDescription: {
    fontSize: 12,
    color: "#666",
  },
  paycheckInfo: {
    padding: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderTopWidth: 2,
    borderTopColor: "#2196f3",
  },
  paycheckText: {
    fontSize: 14,
    color: "#333",
  },
  bold: {
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
