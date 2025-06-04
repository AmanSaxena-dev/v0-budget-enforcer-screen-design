"use client"

import { useState, useMemo } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { format } from "date-fns"
import { useBudget } from "../context/BudgetContext"
import { useAuth } from "../context/AuthContext"
import { formatCurrency } from "../utils/budgetCalculator"

export default function WelcomeScreenV2({ onComplete }) {
  const { startNewPeriod } = useBudget()
  const { user } = useAuth()
  const [currentMoney, setCurrentMoney] = useState("")
  const [activeTab, setActiveTab] = useState("sync")

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

  const preferences = user?.preferences

  const periodDates = useMemo(() => {
    if (!preferences) return null

    const syncPeriodStart = preferences.firstPeriodStart
    const syncPeriodEnd = new Date(preferences.nextPayday)
    syncPeriodEnd.setDate(syncPeriodEnd.getDate() - 1)
    syncPeriodEnd.setHours(23, 59, 59, 999)

    const fullPeriodStart = preferences.nextPayday
    const fullPeriodEnd = new Date(fullPeriodStart)
    fullPeriodEnd.setDate(fullPeriodStart.getDate() + preferences.periodLength - 1)
    fullPeriodEnd.setHours(23, 59, 59, 999)

    return {
      syncPeriodStart,
      syncPeriodEnd,
      fullPeriodStart,
      fullPeriodEnd,
    }
  }, [preferences])

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

  const validationStatus = useMemo(() => {
    if (!preferences) return { syncPeriodValid: false, fullPeriodValid: false }

    const syncPeriodValid =
      syncPeriodEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.syncPeriodTotal === budgetTotals.availableMoney &&
      budgetTotals.availableMoney > 0

    const fullPeriodValid =
      fullPeriodEnvelopes.every((env) => env.name && env.allocation >= 0) &&
      budgetTotals.fullPeriodTotal === preferences.paycheckAmount

    return {
      syncPeriodValid,
      fullPeriodValid,
    }
  }, [syncPeriodEnvelopes, fullPeriodEnvelopes, budgetTotals, preferences])

  const handleSyncEnvelopeChange = (index, field, value) => {
    const newEnvelopes = [...syncPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number.parseFloat(value) || 0,
    }
    setSyncPeriodEnvelopes(newEnvelopes)
  }

  const handleFullEnvelopeChange = (index, field, value) => {
    const newEnvelopes = [...fullPeriodEnvelopes]
    newEnvelopes[index] = {
      ...newEnvelopes[index],
      [field]: field === "name" ? value : Number.parseFloat(value) || 0,
    }
    setFullPeriodEnvelopes(newEnvelopes)
  }

  const addSyncEnvelope = () => {
    setSyncPeriodEnvelopes([...syncPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const addFullEnvelope = () => {
    setFullPeriodEnvelopes([...fullPeriodEnvelopes, { name: "", allocation: 0 }])
  }

  const removeSyncEnvelope = (index) => {
    setSyncPeriodEnvelopes(syncPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const removeFullEnvelope = (index) => {
    setFullPeriodEnvelopes(fullPeriodEnvelopes.filter((_, i) => i !== index))
  }

  const handleCreateBudget = () => {
    if (!currentMoney || budgetTotals.availableMoney <= 0) {
      Alert.alert("Error", "Please enter how much money you have available for this period")
      return
    }

    if (!validationStatus.syncPeriodValid || !validationStatus.fullPeriodValid) {
      Alert.alert("Error", "Please complete both budget periods with valid allocations")
      return
    }

    startNewPeriod(
      periodDates?.syncPeriodStart,
      preferences?.firstPeriodLength,
      syncPeriodEnvelopes.map((env) => ({
        ...env,
        spent: 0,
        periodLength: preferences?.firstPeriodLength,
      })),
      periodDates?.syncPeriodEnd,
    )

    onComplete()
  }

  if (!preferences) return null

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome to Budget Enforcer!</Text>
        <Text style={styles.subtitle}>
          Let's set up your budget periods. You'll create budgets for both your sync period and your first full period.
        </Text>

        <View style={styles.periodOverview}>
          <View style={[styles.periodCard, styles.syncPeriodCard]}>
            <Text style={styles.periodTitle}>Sync Period</Text>
            <Text style={styles.periodDate}>
              {format(periodDates.syncPeriodStart, "MMM d")} - {format(periodDates.syncPeriodEnd, "MMM d, yyyy")}
            </Text>
            <Text style={styles.periodSubtitle}>{preferences.firstPeriodLength} days to sync with your paycheck</Text>
          </View>

          <View style={[styles.periodCard, styles.fullPeriodCard]}>
            <Text style={styles.periodTitle}>First Full Period</Text>
            <Text style={styles.periodDate}>
              {format(periodDates.fullPeriodStart, "MMM d")} - {format(periodDates.fullPeriodEnd, "MMM d, yyyy")}
            </Text>
            <Text style={styles.periodSubtitle}>
              {preferences.periodLength} days • {formatCurrency(preferences.paycheckAmount)} paycheck
            </Text>
          </View>
        </View>

        <View style={styles.moneyInputCard}>
          <Text style={styles.inputLabel}>How much money do you have available to spend during the sync period?</Text>
          <TextInput
            style={styles.moneyInput}
            value={currentMoney}
            onChangeText={setCurrentMoney}
            placeholder="e.g., 500"
            keyboardType="decimal-pad"
          />
          <Text style={styles.inputHint}>
            This is the money you have right now that needs to last until your next paycheck.
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sync" && styles.activeTab]}
            onPress={() => setActiveTab("sync")}
          >
            <Text style={[styles.tabText, activeTab === "sync" && styles.activeTabText]}>Sync Period Budget</Text>
            {budgetTotals.syncPeriodTotal > 0 && (
              <Text style={styles.tabAmount}>({formatCurrency(budgetTotals.syncPeriodTotal)})</Text>
            )}
            {validationStatus.syncPeriodValid && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "full" && styles.activeTab]}
            onPress={() => setActiveTab("full")}
          >
            <Text style={[styles.tabText, activeTab === "full" && styles.activeTabText]}>Full Period Budget</Text>
            {budgetTotals.fullPeriodTotal > 0 && (
              <Text style={styles.tabAmount}>({formatCurrency(budgetTotals.fullPeriodTotal)})</Text>
            )}
            {validationStatus.fullPeriodValid && <Ionicons name="checkmark-circle" size={16} color="#22c55e" />}
          </TouchableOpacity>
        </View>

        {activeTab === "sync" ? (
          <EnvelopeBudgetForm
            title="Sync Period Envelopes"
            envelopes={syncPeriodEnvelopes}
            total={budgetTotals.syncPeriodTotal}
            target={budgetTotals.availableMoney}
            onEnvelopeChange={handleSyncEnvelopeChange}
            onAddEnvelope={addSyncEnvelope}
            onRemoveEnvelope={removeSyncEnvelope}
          />
        ) : (
          <EnvelopeBudgetForm
            title="Full Period Envelopes"
            envelopes={fullPeriodEnvelopes}
            total={budgetTotals.fullPeriodTotal}
            target={preferences.paycheckAmount}
            onEnvelopeChange={handleFullEnvelopeChange}
            onAddEnvelope={addFullEnvelope}
            onRemoveEnvelope={removeFullEnvelope}
          />
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            (!validationStatus.syncPeriodValid || !validationStatus.fullPeriodValid) && styles.createButtonDisabled,
          ]}
          onPress={handleCreateBudget}
          disabled={!validationStatus.syncPeriodValid || !validationStatus.fullPeriodValid}
        >
          <Ionicons name="arrow-forward" size={20} color="white" />
          <Text style={styles.createButtonText}>Create My Budget</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function EnvelopeBudgetForm({ title, envelopes, total, target, onEnvelopeChange, onAddEnvelope, onRemoveEnvelope }) {
  return (
    <View style={styles.budgetForm}>
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetTitle}>{title}</Text>
        <View style={styles.budgetTotals}>
          <Text style={styles.budgetTotal}>
            {formatCurrency(total)} of {formatCurrency(target)}
          </Text>
          <Text style={styles.budgetStatus}>
            {total === target && target > 0
              ? "Fully allocated"
              : target > 0
                ? `${formatCurrency(Math.abs(target - total))} ${total > target ? "over budget" : "remaining"}`
                : "Enter available money above"}
          </Text>
        </View>
      </View>

      <View style={styles.envelopeList}>
        {envelopes.map((envelope, index) => (
          <View key={index} style={styles.envelopeRow}>
            <TextInput
              style={[styles.envelopeInput, styles.envelopeNameInput]}
              value={envelope.name}
              onChangeText={(value) => onEnvelopeChange(index, "name", value)}
              placeholder="Envelope name"
            />
            <TextInput
              style={[styles.envelopeInput, styles.envelopeAmountInput]}
              value={envelope.allocation.toString()}
              onChangeText={(value) => onEnvelopeChange(index, "allocation", value)}
              placeholder="Amount"
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.removeButton} onPress={() => onRemoveEnvelope(index)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addEnvelopeButton} onPress={onAddEnvelope}>
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.addEnvelopeText}>Add Envelope</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
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
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  fullPeriodCard: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  periodDate: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: "#333",
  },
  periodSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  moneyInputCard: {
    backgroundColor: "#f9f9f9",
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
  moneyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
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
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  activeTabText: {
    color: "white",
    fontWeight: "600",
  },
  tabAmount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  budgetForm: {
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
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  budgetTotals: {
    alignItems: "flex-end",
  },
  budgetTotal: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  budgetStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  envelopeList: {
    gap: 12,
  },
  envelopeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  envelopeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "white",
  },
  envelopeNameInput: {
    flex: 3,
  },
  envelopeAmountInput: {
    flex: 2,
  },
  removeButton: {
    padding: 8,
  },
  addEnvelopeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addEnvelopeText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
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
