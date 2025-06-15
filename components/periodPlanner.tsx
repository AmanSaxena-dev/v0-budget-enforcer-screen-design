"use client"

import { useAuth } from "@/context/authContext"
import { useBudget } from "@/context/budgetContext"
import { formatCurrency } from "@/utils/budget-calculator"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

interface Period {
  id: string
  startDate: Date
  endDate: Date
  periodLength: number
  isPlanned: boolean
  isCurrent?: boolean
}

interface PeriodPlan {
  envelopes: Array<{
    name: string
    allocation: number
    spent: number
    periodLength: number
  }>
}

export function PeriodPlannerV2() {
  const { envelopes, getNextPeriods, savePeriodPlan, getPeriodPlan, deletePeriodPlan } = useBudget()
  const { user } = useAuth()
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [plannedEnvelopes, setPlannedEnvelopes] = useState<
    Array<{
      name: string
      allocation: number
      spent: number
      periodLength: number
    }>
  >([])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [nextPeriods, setNextPeriods] = useState<Period[]>([])

  // Load next periods
  useEffect(() => {
    const loadPeriods = async () => {
      const periods = await getNextPeriods()
      setNextPeriods(periods)
    }
    loadPeriods()
  }, [getNextPeriods])

  // Set initial selected period only once when component mounts
  useEffect(() => {
    if (nextPeriods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(nextPeriods[0].id)
    }
  }, [nextPeriods, selectedPeriodId])

  // Get the selected period using useMemo
  const selectedPeriod = useMemo(() => {
    return nextPeriods.find((p) => p.id === selectedPeriodId)
  }, [nextPeriods, selectedPeriodId])

  // Load plan when period is selected
  useEffect(() => {
    const loadPlan = async () => {
      if (selectedPeriodId && selectedPeriod) {
        if (selectedPeriod.isCurrent) {
          // For current period, use the actual envelopes
          setPlannedEnvelopes(
            envelopes.map((env) => ({
              name: env.name,
              allocation: env.allocation,
              spent: env.spent,
              periodLength: env.periodLength,
            })),
          )
        } else {
          const existingPlan = await getPeriodPlan(selectedPeriodId)
          if (existingPlan) {
            setPlannedEnvelopes(existingPlan.envelopes)
          } else {
            // Initialize with current envelopes as template
            setPlannedEnvelopes(
              envelopes.map((env) => ({
                name: env.name,
                allocation: env.allocation,
                spent: 0,
                periodLength: selectedPeriod?.periodLength || 14,
              })),
            )
          }
        }
      }
    }
    loadPlan()
  }, [selectedPeriodId, envelopes, getPeriodPlan, selectedPeriod])

  const handleAddEnvelope = () => {
    setPlannedEnvelopes([
      ...plannedEnvelopes,
      {
        name: "",
        allocation: 0,
        spent: 0,
        periodLength: selectedPeriod?.periodLength || 14,
      },
    ])
  }

  const handleRemoveEnvelope = (index: number) => {
    setPlannedEnvelopes(plannedEnvelopes.filter((_, i) => i !== index))
  }

  const handleEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...plannedEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setPlannedEnvelopes(newEnvelopes)
  }

  const handleSavePlan = async () => {
    if (!selectedPeriodId || selectedPeriod?.isCurrent) return

    // Validate inputs
    if (plannedEnvelopes.some((env) => !env.name || env.allocation <= 0)) {
      setSaveMessage("Please fill in all envelope names and allocations")
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Save the plan
    await savePeriodPlan(selectedPeriodId, { envelopes: plannedEnvelopes })

    // Show success message
    setSaveMessage("Plan saved successfully!")
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const handleDeletePlan = async () => {
    if (!selectedPeriodId || selectedPeriod?.isCurrent) return

    await deletePeriodPlan(selectedPeriodId)

    // Reset to template
    setPlannedEnvelopes(
      envelopes.map((env) => ({
        name: env.name,
        allocation: env.allocation,
        spent: 0,
        periodLength: selectedPeriod?.periodLength || 14,
      })),
    )

    setSaveMessage("Plan deleted")
    setTimeout(() => setSaveMessage(null), 3000)
  }

  // Calculate total budget using useMemo
  const totalBudget = useMemo(() => {
    return plannedEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
  }, [plannedEnvelopes])

  if (!user?.preferences) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.setupMessage}>
            Please complete your initial setup to access period planning.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Plan Future Budget Periods</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Icon name="cog" size={20} color="#007AFF" />
            <Text style={styles.settingsButtonText}>Period Settings</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Your budget periods are based on your {user.preferences.paycheckFrequency} paycheck schedule
          {user.preferences.paycheckFrequency === "monthly" &&
            ` (${format(user.preferences.nextPayday, "do")} of each month)`}
          {user.preferences.paycheckFrequency === "semimonthly" &&
            user.preferences.semiMonthlyPayDays &&
            ` (${user.preferences.semiMonthlyPayDays[0]}${getOrdinalSuffix(user.preferences.semiMonthlyPayDays[0])} and ${user.preferences.semiMonthlyPayDays[1]}${getOrdinalSuffix(user.preferences.semiMonthlyPayDays[1])} of each month)`}
          . Plan your envelope allocations for the next periods.
        </Text>

        <View style={styles.tabsContainer}>
          {nextPeriods.map((period, index) => (
            <TouchableOpacity
              key={period.id}
              style={[
                styles.tab,
                selectedPeriodId === period.id && styles.activeTab,
              ]}
              onPress={() => setSelectedPeriodId(period.id)}
            >
              <Text style={[styles.tabTitle, selectedPeriodId === period.id && styles.activeTabText]}>
                {period.isCurrent ? "Current Period" : index === 1 ? "Next Period" : `Period ${index}`}
              </Text>
              <Text style={styles.tabDate}>
                {format(period.startDate, "MMM d")} - {format(period.endDate, "MMM d")}
              </Text>
              {period.isPlanned && !period.isCurrent && (
                <View style={styles.plannedIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedPeriod && (
          <View style={styles.periodContent}>
            <View style={styles.periodHeader}>
              <View>
                <Text style={styles.periodTitle}>
                  {format(selectedPeriod.startDate, "MMMM d, yyyy")} -{" "}
                  {format(selectedPeriod.endDate, "MMMM d, yyyy")}
                </Text>
                <Text style={styles.periodSubtitle}>
                  {selectedPeriod.periodLength} day period
                  {selectedPeriod.isCurrent && " (Currently Active)"}
                  {user.preferences?.paycheckFrequency === "monthly" && " • Monthly paycheck"}
                  {user.preferences?.paycheckFrequency === "semimonthly" && " • Semi-monthly paycheck"}
                  {user.preferences?.paycheckFrequency === "weekly" && " • Weekly paycheck"}
                  {user.preferences?.paycheckFrequency === "biweekly" && " • Bi-weekly paycheck"}
                </Text>
              </View>
              <View style={styles.budgetSummary}>
                <Text style={styles.budgetLabel}>Total Budget</Text>
                <Text style={styles.budgetAmount}>{formatCurrency(totalBudget)}</Text>
                {!selectedPeriod.isCurrent && (
                  <Text style={styles.targetAmount}>
                    Target: {formatCurrency(user.preferences.paycheckAmount)}
                  </Text>
                )}
              </View>
            </View>

            {saveMessage && (
              <View
                style={[
                  styles.alert,
                  saveMessage.includes("successfully") ? styles.successAlert : styles.errorAlert,
                ]}
              >
                <Text style={styles.alertText}>{saveMessage}</Text>
              </View>
            )}

            <View style={styles.envelopesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedPeriod.isCurrent ? "Current Envelopes" : "Planned Envelopes"}
                </Text>
                {selectedPeriod.isPlanned && !selectedPeriod.isCurrent && (
                  <View style={styles.savedIndicator}>
                    <Icon name="check" size={16} color="#059669" />
                    <Text style={styles.savedText}>Plan Saved</Text>
                  </View>
                )}
              </View>

              {plannedEnvelopes.map((envelope, index) => (
                <View key={index} style={styles.envelopeRow}>
                  <TextInput
                    style={styles.nameInput}
                    placeholder="Envelope name"
                    value={envelope.name}
                    onChangeText={(value) => handleEnvelopeChange(index, "name", value)}
                    editable={!selectedPeriod.isCurrent}
                  />
                  <TextInput
                    style={styles.amountInput}
                    placeholder="Allocation"
                    value={envelope.allocation.toString()}
                    onChangeText={(value) => handleEnvelopeChange(index, "allocation", value)}
                    keyboardType="numeric"
                    editable={!selectedPeriod.isCurrent}
                  />
                  {!selectedPeriod.isCurrent && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveEnvelope(index)}
                    >
                      <Icon name="trash-can" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {!selectedPeriod.isCurrent && (
                <TouchableOpacity style={styles.addButton} onPress={handleAddEnvelope}>
                  <Icon name="plus" size={20} color="#007AFF" />
                  <Text style={styles.addButtonText}>Add Envelope</Text>
                </TouchableOpacity>
              )}
            </View>

            {!selectedPeriod.isCurrent && (
              <View style={styles.footer}>
                {selectedPeriod.isPlanned && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePlan}>
                    <Icon name="close" size={20} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete Plan</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan}>
                  <Icon name="content-save" size={20} color="#007AFF" />
                  <Text style={styles.saveButtonText}>Save Plan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  content: {
    padding: 24,
  },
  setupMessage: {
    textAlign: "center",
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  settingsButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  activeTab: {
    borderBottomColor: "#007AFF",
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#007AFF",
  },
  tabDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  plannedIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  periodContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  periodSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  budgetSummary: {
    alignItems: "flex-end",
  },
  budgetLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  budgetAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  targetAmount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  alert: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successAlert: {
    backgroundColor: "#ECFDF5",
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
  },
  alertText: {
    color: "#111827",
  },
  envelopesSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  savedIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  savedText: {
    marginLeft: 4,
    color: "#059669",
    fontSize: 14,
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  nameInput: {
    flex: 3,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    fontSize: 16,
  },
  amountInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 8,
    marginRight: 8,
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 6,
    marginTop: 8,
  },
  addButtonText: {
    marginLeft: 8,
    color: "#007AFF",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 6,
  },
  deleteButtonText: {
    marginLeft: 8,
    color: "#EF4444",
    fontSize: 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 6,
  },
  saveButtonText: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 16,
  },
})
