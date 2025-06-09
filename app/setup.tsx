"use client"

import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/context/authContext"
import DateTimePicker from "@react-native-community/datetimepicker"
import { formatCurrency } from "@/utils/budget-calculator"

export default function SetupScreen() {
  const { updateUserPreferences } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [paycheckFrequency, setPaycheckFrequency] = useState("")
  const [nextPayday, setNextPayday] = useState(new Date())
  const [paycheckAmount, setPaycheckAmount] = useState("")
  const [semiMonthlyPayDays, setSemiMonthlyPayDays] = useState<[number, number]>([1, 15])
  const [showDatePicker, setShowDatePicker] = useState(false)

  const today = new Date()

  const calculatePeriodSetup = () => {
    if (!nextPayday || !paycheckFrequency) return null

    const daysUntilPayday = Math.ceil((nextPayday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    let periodLength = 14 // default

    switch (paycheckFrequency) {
      case "weekly":
        periodLength = 7
        break
      case "biweekly":
        periodLength = 14
        break
      case "monthly":
        const nextMonth = new Date(nextPayday)
        nextMonth.setMonth(nextPayday.getMonth() + 1)
        periodLength = Math.ceil((nextMonth.getTime() - nextPayday.getTime()) / (1000 * 60 * 60 * 24))
        break
      case "semimonthly":
        const [firstPayDay, secondPayDay] = semiMonthlyPayDays.sort((a, b) => a - b)
        const currentPayDay = nextPayday.getDate()

        if (currentPayDay === firstPayDay) {
          periodLength = secondPayDay - firstPayDay
        } else {
          const daysInMonth = new Date(nextPayday.getFullYear(), nextPayday.getMonth() + 1, 0).getDate()
          periodLength = daysInMonth - currentPayDay + firstPayDay
        }
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
      if (paycheckFrequency === "semimonthly") {
        setStep(3)
      } else {
        setStep(4)
      }
    } else if (step === 3) {
      setStep(4)
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
          nextPayday,
          paycheckAmount: Number.parseFloat(paycheckAmount),
          paycheckFrequency,
          autoCreatePeriods: true,
          monthlyPayDay: paycheckFrequency === "monthly" ? nextPayday.getDate() : undefined,
          semiMonthlyPayDays: paycheckFrequency === "semimonthly" ? semiMonthlyPayDays : undefined,
        })
        router.replace("/(tabs)")
      }
    }
  }

  const setup = calculatePeriodSetup()

  const frequencyOptions = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Every 2 weeks" },
    { value: "semimonthly", label: "Twice a month" },
    { value: "monthly", label: "Monthly" },
  ]

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Paycheck Setup</Text>

        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How often do you get paid?</Text>
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionButton, paycheckFrequency === option.value && styles.selectedOption]}
                onPress={() => setPaycheckFrequency(option.value)}
              >
                <Text style={[styles.optionText, paycheckFrequency === option.value && styles.selectedOptionText]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Paycheck Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>When is your next payday?</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{nextPayday.toLocaleDateString()}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={nextPayday}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === "ios")
                    if (selectedDate) {
                      setNextPayday(selectedDate)
                      if (paycheckFrequency === "semimonthly") {
                        setSemiMonthlyPayDays([selectedDate.getDate(), semiMonthlyPayDays[1]])
                      }
                    }
                  }}
                  minimumDate={today}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>How much is your paycheck? (after taxes)</Text>
              <TextInput
                style={styles.input}
                value={paycheckAmount}
                onChangeText={setPaycheckAmount}
                placeholder="e.g., 2500"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {step === 3 && paycheckFrequency === "semimonthly" && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Semi-Monthly Pay Schedule</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First payday of the month</Text>
              <TextInput
                style={styles.input}
                value={semiMonthlyPayDays[0].toString()}
                onChangeText={(text) => setSemiMonthlyPayDays([Number.parseInt(text) || 1, semiMonthlyPayDays[1]])}
                placeholder="e.g., 1"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Second payday of the month</Text>
              <TextInput
                style={styles.input}
                value={semiMonthlyPayDays[1].toString()}
                onChangeText={(text) => setSemiMonthlyPayDays([semiMonthlyPayDays[0], Number.parseInt(text) || 15])}
                placeholder="e.g., 15"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.helpText}>Your budget periods will start on these days each month.</Text>
          </View>
        )}

        {step === 4 && setup && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Budget Schedule</Text>

            <View style={styles.scheduleCard}>
              <View style={styles.periodInfo}>
                <Text style={styles.periodTitle}>Sync Period (Starting Today)</Text>
                <Text style={styles.periodDate}>
                  {setup.firstPeriodStart.toLocaleDateString()} ({setup.firstPeriodLength} days)
                </Text>
                <Text style={styles.periodDescription}>
                  This period will sync your budget with your paycheck schedule.
                </Text>
              </View>

              <View style={styles.periodInfo}>
                <Text style={styles.periodTitle}>First Full Period</Text>
                <Text style={styles.periodDate}>Starting {nextPayday.toLocaleDateString()}</Text>
                <Text style={styles.periodDescription}>
                  {paycheckFrequency === "monthly"
                    ? `Your monthly budget periods will start on the ${nextPayday.getDate()}${getOrdinalSuffix(nextPayday.getDate())} of each month.`
                    : paycheckFrequency === "semimonthly"
                      ? `Your budget periods will start on the ${semiMonthlyPayDays[0]}${getOrdinalSuffix(semiMonthlyPayDays[0])} and ${semiMonthlyPayDays[1]}${getOrdinalSuffix(semiMonthlyPayDays[1])} of each month.`
                      : `Your regular ${setup.periodLength}-day budget periods will start here.`}
                </Text>
              </View>

              <View style={styles.paycheckInfo}>
                <Text style={styles.paycheckText}>
                  <Text style={styles.bold}>Paycheck:</Text> {formatCurrency(Number.parseFloat(paycheckAmount || "0"))}{" "}
                  every{" "}
                  {paycheckFrequency === "biweekly"
                    ? "2 weeks"
                    : paycheckFrequency === "semimonthly"
                      ? "2 weeks"
                      : paycheckFrequency}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 4 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                ((step === 1 && !paycheckFrequency) ||
                  (step === 2 && (!nextPayday || !paycheckAmount)) ||
                  (step === 3 &&
                    paycheckFrequency === "semimonthly" &&
                    (!semiMonthlyPayDays[0] ||
                      !semiMonthlyPayDays[1] ||
                      semiMonthlyPayDays[0] === semiMonthlyPayDays[1]))) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={
                (step === 1 && !paycheckFrequency) ||
                (step === 2 && (!nextPayday || !paycheckAmount)) ||
                (step === 3 &&
                  paycheckFrequency === "semimonthly" &&
                  (!semiMonthlyPayDays[0] || !semiMonthlyPayDays[1] || semiMonthlyPayDays[0] === semiMonthlyPayDays[1]))
              }
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={handleComplete}>
              <Text style={styles.nextButtonText}>Continue to Budget Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return "st"
  }
  if (j === 2 && k !== 12) {
    return "nd"
  }
  if (j === 3 && k !== 13) {
    return "rd"
  }
  return "th"
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#333",
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "white",
  },
  selectedOption: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedOptionText: {
    color: "#007AFF",
    fontWeight: "600",
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
    backgroundColor: "white",
  },
  dateButton: {
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
  helpText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  scheduleCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
  },
  periodInfo: {
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  periodDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  periodDescription: {
    fontSize: 12,
    color: "#888",
  },
  paycheckInfo: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  paycheckText: {
    fontSize: 14,
    color: "#333",
  },
  bold: {
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  backButtonText: {
    fontSize: 16,
    color: "#666",
  },
  nextButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
    alignItems: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
