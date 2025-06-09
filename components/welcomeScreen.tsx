"use client"

import { useState, useMemo } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { useAuth } from "@/context/authContext"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "@/utils/budget-calculator"

export function WelcomeScreen() {
  const { startNewPeriod } = useBudget()
  const { user } = useAuth()
  const [currentMoney, setCurrentMoney] = useState("")
  const [syncPeriodEnvelopes, setSyncPeriodEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])
  const [fullPeriodEnvelopes, setFullPeriodEnvelopes] = useState([
    { name: "Food", allocation: 0 },
    { name: "Entertainment", allocation: 0 },
    { name: "Transportation", allocation: 0 },
    { name: "Saving & Investing", allocation: 0 },
  ])
  const [activeTab, setActiveTab] = useState("sync")

  const preferences = user?.preferences

  // Calculate period dates
  const periodDates = useMemo(() => {
    if (!preferences) return null

    const syncPeriodStart = preferences.firstPeriodStart
    const syncPeriodEnd = new Date(preferences.nextPayday)
    syncPeriodEnd.setDate(syncPeriodEnd.getDate() - 1)
    syncPeriodEnd.setHours(23, 59, 59, 999)

    const fullPeriodStart = preferences.nextPayday
    let fullPeriodEnd: Date

    if (preferences.paycheckFrequency === "monthly") {
      fullPeriodEnd = new Date(fullPeriodStart)
      fullPeriodEnd.setMonth(fullPeriodStart.getMonth() + 1)
      fullPeriodEnd.setDate(fullPeriodStart.getDate() - 1)
    } else if (preferences.paycheckFrequency === "semimonthly" && preferences.semiMonthlyPayDays) {
      fullPeriodEnd = new Date(fullPeriodStart)
      const [firstPayDay, secondPayDay] = preferences.semiMonthlyPayDays.sort((a: any, b: any) => a - b)
      const currentPayDay = fullPeriodStart.getDate()

      if (currentPayDay === firstPayDay) {
        fullPeriodEnd.setDate(secondPayDay - 1)
      } else {
        fullPeriodEnd.setMonth(fullPeriodStart.getMonth() + 1)
        fullPeriodEnd.setDate(firstPayDay - 1)
      }
    } else {
      fullPeriodEnd = new Date(fullPeriodStart)
      fullPeriodEnd.setDate(fullPeriodStart.getDate() + preferences.periodLength - 1)
    }

    fullPeriodEnd.setHours(23, 59, 59, 999)

    return {
      syncPeriodStart,
      syncPeriodEnd,
      fullPeriodStart,
      fullPeriodEnd,
    }
  }, [preferences])

  // Calculate totals
  const budgetTotals = useMemo(() => {
    const availableMoney = Number.parseFloat(currentMoney) || 0
    const syncPeriodTotal = syncPeriodEnvelopes.reduce((sum, env) => sum + env.allocation, 0)
    const fullPeriodTotal = fullPeriodEnvelopes.reduce((sum, env) => sum + env.allocation, 0)

    return {
      availableMoney,
      syncPeriodTotal,
      fullPeriodTotal,
    }
  }, [currentMoney, syncPeriodEnvelopes, fullPeriodEnvelopes])

  const handleSyncEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...syncPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setSyncPeriodEnvelopes(newEnvelopes)
  }

  const handleFullEnvelopeChange = (index: number, field: string, value: string | number) => {
    const newEnvelopes = [...fullPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number(value),
    }
    setFullPeriodEnvelopes(newEnvelopes)
  }

  const handleAddSyncEnvelope = () => {
    setSyncPeriodEnvelopes([...syncPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const handleAddFullEnvelope = () => {
    setFullPeriodEnvelopes([...fullPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const handleRemoveSyncEnvelope = (index: number) => {
    setSyncPeriodEnvelopes(syncPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const handleRemoveFullEnvelope = (index: number) => {
    setFullPeriodEnvelopes(fullPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const handleCreateBudget = () => {
    // Validation
    if (!currentMoney || budgetTotals.availableMoney <= 0) {
      Alert.alert("Error", "Please enter how much money you have available for this period")
      return
    }

    if (syncPeriodEnvelopes.some((env) => !env.name || env.allocation < 0)) {
      Alert.alert("Error", "Please fill in all sync period envelope names and allocations")
      return
    }

    if (fullPeriodEnvelopes.some((env) => !env.name || env.allocation < 0)) {
      Alert.alert("Error", "Please fill in all full period envelope names and allocations")
      return
    }

    if (budgetTotals.syncPeriodTotal !== budgetTotals.availableMoney) {
      Alert.alert(
        "Error",
        `Your sync period budget (${formatCurrency(budgetTotals.syncPeriodTotal)}) must equal your available money (${formatCurrency(budgetTotals.availableMoney)}). Please allocate all funds to envelopes.`,
      )
      return
    }

    if (budgetTotals.fullPeriodTotal !== preferences?.paycheckAmount) {
      Alert.alert(
        "Error",
        `Your full period budget (${formatCurrency(budgetTotals.fullPeriodTotal)}) must equal your paycheck amount (${formatCurrency(preferences?.paycheckAmount || 0)}). Please allocate all funds to envelopes.`,
      )
      return
    }

    // Start with the sync period
    startNewPeriod(
      periodDates?.syncPeriodStart!,
      preferences?.firstPeriodLength!,
      syncPeriodEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.firstPeriodLength!,
      })),
      periodDates?.syncPeriodEnd,
    )
  }

  if (!preferences || !periodDates) return null

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Budget Enforcer!</Text>
        <Text style={styles.subtitle}>
          Let's set up your budget periods. You'll create budgets for both your sync period and your first full period.
        </Text>

        {/* Period Overview */}
        <View style={styles.periodOverview}>
          <View style={[styles.periodCard, styles.syncPeriodCard]}>
            <Text style={styles.periodCardTitle}>Sync Period</Text>
            <Text style={styles.periodCardDate}>
              {periodDates.syncPeriodStart.toLocaleDateString()} - {periodDates.syncPeriodEnd.toLocaleDateString()}
            </Text>
            <Text style={styles.periodCardDescription}>
              {preferences.firstPeriodLength} days to sync with your paycheck
            </Text>
          </View>

          <View style={[styles.periodCard, styles.fullPeriodCard]}>
            <Text style={styles.periodCardTitle}>First Full Period</Text>
            <Text style={styles.periodCardDate}>
              {periodDates.fullPeriodStart.toLocaleDateString()} - {periodDates.fullPeriodEnd.toLocaleDateString()}
            </Text>
            <Text style={styles.periodCardDescription}>
              {preferences.periodLength} days • {formatCurrency(preferences.paycheckAmount)} paycheck
            </Text>
          </View>
        </View>

        {/* Available Money Input */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>How much money do you have available to spend during the sync period?</Text>
          <TextInput
            style={styles.input}
            value={currentMoney}
            onChangeText={setCurrentMoney}
            placeholder="e.g., 500"
            keyboardType="numeric"
          />
          <Text style={styles.inputHelp}>
            This is the money you have right now that needs to last until your next paycheck.
          </Text>
        </View>

        {/* Budget Setup Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sync" && styles.activeTab]}
            onPress={() => setActiveTab("sync")}
          >
            <Text style={[styles.tabText, activeTab === "sync" && styles.activeTabText]}>Sync Period Budget</Text>
            {budgetTotals.syncPeriodTotal > 0 && (
              <Text style={styles.tabAmount}>({formatCurrency(budgetTotals.syncPeriodTotal)})</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "full" && styles.activeTab]}
            onPress={() => setActiveTab("full")}
          >
            <Text style={[styles.tabText, activeTab === "full" && styles.activeTabText]}>Full Period Budget</Text>
            {budgetTotals.fullPeriodTotal > 0 && (
              <Text style={styles.tabAmount}>({formatCurrency(budgetTotals.fullPeriodTotal)})</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === "sync" ? (
          <View style={styles.tabContent}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Sync Period Envelopes</Text>
              <View style={styles.budgetTotal}>
                <Text style={styles.budgetTotalAmount}>
                  {formatCurrency(budgetTotals.syncPeriodTotal)} of {formatCurrency(budgetTotals.availableMoney)}
                </Text>
                <Text style={styles.budgetTotalStatus}>
                  {budgetTotals.syncPeriodTotal === budgetTotals.availableMoney && budgetTotals.availableMoney > 0
                    ? "Fully allocated"
                    : budgetTotals.availableMoney > 0
                      ? `${formatCurrency(Math.abs(budgetTotals.availableMoney - budgetTotals.syncPeriodTotal))} ${budgetTotals.syncPeriodTotal > budgetTotals.availableMoney ? "over budget" : "remaining"}`
                      : "Enter available money above"}
                </Text>
              </View>
            </View>

            {syncPeriodEnvelopes.map((envelope, index) => (
              <View key={index} style={styles.envelopeRow}>
                <TextInput
                  style={[styles.input, styles.envelopeNameInput]}
                  placeholder="Envelope name"
                  value={envelope.name}
                  onChangeText={(text) => handleSyncEnvelopeChange(index, "name", text)}
                />
                <TextInput
                  style={[styles.input, styles.envelopeAmountInput]}
                  placeholder="Amount"
                  value={envelope.allocation.toString()}
                  onChangeText={(text) => handleSyncEnvelopeChange(index, "allocation", text)}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveSyncEnvelope(index)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={handleAddSyncEnvelope}>
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Envelope</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tabContent}>
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetTitle}>Full Period Envelopes</Text>
              <View style={styles.budgetTotal}>
                <Text style={styles.budgetTotalAmount}>
                  {formatCurrency(budgetTotals.fullPeriodTotal)} of {formatCurrency(preferences.paycheckAmount)}
                </Text>
                <Text style={styles.budgetTotalStatus}>
                  {budgetTotals.fullPeriodTotal === preferences.paycheckAmount
                    ? "Fully allocated"
                    : `${formatCurrency(Math.abs(preferences.paycheckAmount - budgetTotals.fullPeriodTotal))} ${budgetTotals.fullPeriodTotal > preferences.paycheckAmount ? "over budget" : "remaining"}`}
                </Text>
              </View>
            </View>

            {fullPeriodEnvelopes.map((envelope, index) => (
              <View key={index} style={styles.envelopeRow}>
                <TextInput
                  style={[styles.input, styles.envelopeNameInput]}
                  placeholder="Envelope name"
                  value={envelope.name}
                  onChangeText={(text) => handleFullEnvelopeChange(index, "name", text)}
                />
                <TextInput
                  style={[styles.input, styles.envelopeAmountInput]}
                  placeholder="Amount"
                  value={envelope.allocation.toString()}
                  onChangeText={(text) => handleFullEnvelopeChange(index, "allocation", text)}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFullEnvelope(index)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={handleAddFullEnvelope}>
              <Ionicons name="add" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>Add Envelope</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!currentMoney ||
              budgetTotals.availableMoney <= 0 ||
              budgetTotals.syncPeriodTotal !== budgetTotals.availableMoney ||
              budgetTotals.fullPeriodTotal !== preferences.paycheckAmount) &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreateBudget}
          disabled={
            !currentMoney ||
            budgetTotals.availableMoney <= 0 ||
            budgetTotals.syncPeriodTotal !== budgetTotals.availableMoney ||
            budgetTotals.fullPeriodTotal !== preferences.paycheckAmount
          }
        >
          <Ionicons name="arrow-forward" size={20} color="white" />
          <Text style={styles.createButtonText}>Create My Budget</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    margin: 16,
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
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  periodOverview: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  periodCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncPeriodCard: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  fullPeriodCard: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4caf50",
  },
  periodCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#333",
  },
  periodCardDate: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: "#333",
  },
  periodCardDescription: {
    fontSize: 12,
    color: "#666",
  },
  inputCard: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  inputLabel: {
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
  inputHelp: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  activeTabText: {
    color: "#333",
    fontWeight: "600",
  },
  tabAmount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  tabContent: {
    marginBottom: 24,
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  budgetTotal: {
    alignItems: "flex-end",
  },
  budgetTotalAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  budgetTotalStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  envelopeNameInput: {
    flex: 2,
  },
  envelopeAmountInput: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    borderStyle: "dashed",
    gap: 8,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
