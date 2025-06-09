"use client"

import { useState, useMemo } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency } from "../utils/budgetCalculator"
import { Ionicons } from "@expo/vector-icons"

const EnvelopeShuffle = ({ onCancel, onComplete }) => {
  const { envelopes, currentEnvelope, currentPurchase, shuffleEnvelopes } = useBudget()
  const [strategy, setStrategy] = useState("manual")
  const [allocations, setAllocations] = useState([])
  const [isConfirming, setIsConfirming] = useState(false)

  // Calculate the amount needed for the purchase
  const amountNeeded = useMemo(() => {
    if (!currentEnvelope || !currentPurchase) return 0
    const remaining = currentEnvelope.allocation - currentEnvelope.spent
    return Math.max(0, currentPurchase.amount - remaining)
  }, [currentEnvelope, currentPurchase])

  // Calculate the total amount allocated for shuffling
  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  }, [allocations])

  // Calculate the remaining amount needed
  const remainingNeeded = amountNeeded - totalAllocated

  // Get available envelopes (excluding the current one)
  const availableEnvelopes = useMemo(() => {
    if (!currentEnvelope) return []
    return envelopes.filter((env) => env.id !== currentEnvelope.id && env.allocation - env.spent > 0)
  }, [envelopes, currentEnvelope])

  // Initialize allocations when strategy changes
  const initializeAllocations = (newStrategy) => {
    if (!currentEnvelope || !currentPurchase || availableEnvelopes.length === 0) return

    let newAllocations = []

    switch (newStrategy) {
      case "manual":
        newAllocations = availableEnvelopes.map((env) => ({
          envelopeId: env.id,
          amount: 0,
        }))
        break

      case "reduce-from-all":
        const totalRemaining = availableEnvelopes.reduce((sum, env) => sum + (env.allocation - env.spent), 0)
        newAllocations = availableEnvelopes.map((env) => {
          const remaining = env.allocation - env.spent
          const proportion = remaining / totalRemaining
          const amount = Math.min(remaining, amountNeeded * proportion)
          return {
            envelopeId: env.id,
            amount: Math.round(amount * 100) / 100,
          }
        })
        break

      case "recommended":
        const sortedEnvelopes = [...availableEnvelopes].sort((a, b) => {
          const aPrevRemaining = a.previousRemaining || 0
          const bPrevRemaining = b.previousRemaining || 0

          if (aPrevRemaining > 0 && bPrevRemaining === 0) return -1
          if (aPrevRemaining === 0 && bPrevRemaining > 0) return 1

          const aRemaining = a.allocation - a.spent
          const bRemaining = b.allocation - b.spent
          return bRemaining - aRemaining
        })

        let remainingToAllocate = amountNeeded
        newAllocations = []

        for (const env of sortedEnvelopes) {
          if (remainingToAllocate <= 0) break

          const available = env.allocation - env.spent
          const toTake = Math.min(available, remainingToAllocate)

          if (toTake > 0) {
            newAllocations.push({
              envelopeId: env.id,
              amount: Math.round(toTake * 100) / 100,
            })
            remainingToAllocate -= toTake
          }
        }
        break
    }

    setAllocations(newAllocations)
  }

  // Update allocation for a specific envelope
  const updateAllocation = (envelopeId, amount) => {
    const newAllocations = allocations.map((allocation) => {
      if (allocation.envelopeId === envelopeId) {
        return { ...allocation, amount }
      }
      return allocation
    })
    setAllocations(newAllocations)
  }

  // Handle strategy change
  const handleStrategyChange = (newStrategy) => {
    setStrategy(newStrategy)
    initializeAllocations(newStrategy)
  }

  // Handle confirm button click
  const handleConfirm = () => {
    if (totalAllocated < amountNeeded) {
      Alert.alert("Error", `You still need to allocate ${formatCurrency(remainingNeeded)} more.`)
      return
    }
    setIsConfirming(true)
  }

  // Handle final confirmation
  const handleFinalConfirm = () => {
    if (!currentEnvelope || !currentPurchase) return
    shuffleEnvelopes(currentEnvelope.id, currentPurchase, allocations)
    onComplete()
  }

  // Initialize allocations on first render
  useMemo(() => {
    initializeAllocations(strategy)
  }, [amountNeeded, availableEnvelopes])

  if (!currentEnvelope || !currentPurchase) {
    return null
  }

  // Progress bar component
  const ProgressBar = ({ value, color = "#3b82f6" }) => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: color, width: `${value}%` }]} />
    </View>
  )

  // Strategy option component
  const StrategyOption = ({ value, label, selected, onPress }) => (
    <TouchableOpacity style={styles.strategyOption} onPress={onPress}>
      <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
        {selected && <View style={styles.radioButtonInner} />}
      </View>
      <Text style={styles.strategyLabel}>{label}</Text>
    </TouchableOpacity>
  )

  // If we're confirming, show the confirmation screen
  if (isConfirming) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Confirm Envelope Shuffle</Text>

          <Text style={styles.confirmationText}>
            You are about to move {formatCurrency(totalAllocated)} from other envelopes to your{" "}
            <Text style={styles.boldText}>{currentEnvelope.name}</Text> envelope to cover your purchase of{" "}
            {formatCurrency(currentPurchase.amount)}
            {currentPurchase.item ? ` for ${currentPurchase.item}` : ""}.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impact on source envelopes:</Text>

            {allocations
              .filter((allocation) => allocation.amount > 0)
              .map((allocation) => {
                const envelope = envelopes.find((env) => env.id === allocation.envelopeId)
                if (!envelope) return null

                const currentRemaining = envelope.allocation - envelope.spent
                const newRemaining = currentRemaining - allocation.amount
                const currentPercentUsed = (envelope.spent / envelope.allocation) * 100
                const newPercentUsed = ((envelope.spent + allocation.amount) / envelope.allocation) * 100

                return (
                  <View key={allocation.envelopeId} style={styles.envelopeImpact}>
                    <View style={styles.envelopeHeader}>
                      <Text style={styles.envelopeName}>{envelope.name}</Text>
                      <Text style={styles.allocationAmount}>{formatCurrency(allocation.amount)} will be taken</Text>
                    </View>

                    {/* Before shuffle */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Current</Text>
                        <Text style={styles.progressValue}>{formatCurrency(currentRemaining)} remaining</Text>
                      </View>
                      <ProgressBar value={currentPercentUsed} />
                      <View style={styles.progressFooter}>
                        <Text style={styles.progressFooterText}>{formatCurrency(envelope.spent)} spent</Text>
                        <Text style={styles.progressFooterText}>{formatCurrency(envelope.allocation)} total</Text>
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                      <Ionicons name="arrow-down" size={20} color="#6b7280" />
                    </View>

                    {/* After shuffle */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>After shuffle</Text>
                        <Text style={styles.progressValue}>{formatCurrency(newRemaining)} remaining</Text>
                      </View>
                      <ProgressBar value={newPercentUsed} color="#f59e0b" />
                      <View style={styles.progressFooter}>
                        <Text style={styles.progressFooterText}>{formatCurrency(envelope.spent)} spent</Text>
                        <Text style={styles.progressFooterText}>
                          {formatCurrency(envelope.allocation - allocation.amount)} total
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => setIsConfirming(false)}>
              <Ionicons name="arrow-back" size={16} color="#374151" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleFinalConfirm}>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.confirmButtonText}>Confirm Shuffle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Envelope Shuffle</Text>

        <View style={styles.section}>
          <Text style={styles.description}>
            You need {formatCurrency(amountNeeded)} more to cover your purchase of{" "}
            {formatCurrency(currentPurchase.amount)}
            {currentPurchase.item ? ` for ${currentPurchase.item}` : ""}.
          </Text>
          <Text style={styles.subdescription}>Choose how you want to shuffle money from other envelopes.</Text>
        </View>

        <View style={styles.section}>
          <StrategyOption
            value="manual"
            label="Manual Selection"
            selected={strategy === "manual"}
            onPress={() => handleStrategyChange("manual")}
          />
          <StrategyOption
            value="reduce-from-all"
            label="Reduce From All"
            selected={strategy === "reduce-from-all"}
            onPress={() => handleStrategyChange("reduce-from-all")}
          />
          <StrategyOption
            value="recommended"
            label="Recommended"
            selected={strategy === "recommended"}
            onPress={() => handleStrategyChange("recommended")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.allocationHeader}>
            <Text style={styles.sectionTitle}>Available Envelopes</Text>
            <Text style={styles.allocationProgress}>
              <Text style={styles.boldText}>
                {formatCurrency(totalAllocated)} / {formatCurrency(amountNeeded)}
              </Text>{" "}
              allocated
            </Text>
          </View>

          {availableEnvelopes.length === 0 ? (
            <Text style={styles.noEnvelopesText}>No envelopes available for shuffling.</Text>
          ) : (
            <View style={styles.envelopesList}>
              {availableEnvelopes.map((envelope) => {
                const allocation = allocations.find((a) => a.envelopeId === envelope.id)
                const remaining = envelope.allocation - envelope.spent
                const maxAmount = Math.min(remaining, amountNeeded)
                const percentUsed = (envelope.spent / envelope.allocation) * 100
                const allocationAmount = allocation?.amount || 0
                const newPercentUsed = ((envelope.spent + allocationAmount) / envelope.allocation) * 100

                return (
                  <View key={envelope.id} style={styles.envelopeItem}>
                    <View style={styles.envelopeItemHeader}>
                      <View>
                        <Text style={styles.envelopeName}>{envelope.name}</Text>
                        <Text style={styles.availableAmount}>{formatCurrency(remaining)} available</Text>
                      </View>
                      {strategy === "manual" && (
                        <TextInput
                          style={styles.amountInput}
                          value={allocation?.amount?.toString() || "0"}
                          onChangeText={(text) => {
                            const value = Number.parseFloat(text) || 0
                            if (value >= 0 && value <= maxAmount) {
                              updateAllocation(envelope.id, value)
                            }
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      )}
                      {strategy !== "manual" && allocation && (
                        <Text style={styles.allocationDisplay}>{formatCurrency(allocation.amount)}</Text>
                      )}
                    </View>

                    {allocation && allocation.amount > 0 && (
                      <View style={styles.impactSection}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Current usage</Text>
                          <Text style={styles.progressValue}>{Math.round(percentUsed)}%</Text>
                        </View>
                        <ProgressBar value={percentUsed} />

                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>After shuffle</Text>
                          <Text style={styles.progressValue}>{Math.round(newPercentUsed)}%</Text>
                        </View>
                        <ProgressBar value={newPercentUsed} color={newPercentUsed > 80 ? "#f59e0b" : "#3b82f6"} />
                      </View>
                    )}

                    {envelope.previousRemaining && envelope.previousRemaining > 0 && (
                      <Text style={styles.previousRemainingText}>
                        Had {formatCurrency(envelope.previousRemaining)} remaining last period
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (totalAllocated < amountNeeded || availableEnvelopes.length === 0) && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={totalAllocated < amountNeeded || availableEnvelopes.length === 0}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  card: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
  },
  subdescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  confirmationText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  strategyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#3b82f6",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3b82f6",
  },
  strategyLabel: {
    fontSize: 16,
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  allocationProgress: {
    fontSize: 14,
  },
  noEnvelopesText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 20,
  },
  envelopesList: {
    gap: 12,
  },
  envelopeItem: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
  },
  envelopeItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: "500",
  },
  availableAmount: {
    fontSize: 14,
    color: "#6b7280",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
    width: 80,
    textAlign: "center",
  },
  allocationDisplay: {
    fontSize: 16,
    fontWeight: "500",
  },
  impactSection: {
    marginTop: 8,
  },
  progressContainer: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginVertical: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  progressValue: {
    fontSize: 12,
    color: "#6b7280",
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressFooterText: {
    fontSize: 12,
    color: "#6b7280",
  },
  previousRemainingText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
  },
  envelopeImpact: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  envelopeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  allocationAmount: {
    fontSize: 14,
    color: "#6b7280",
  },
  progressSection: {
    marginBottom: 16,
  },
  arrowContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
  },
  backButtonText: {
    marginLeft: 8,
    color: "#374151",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },
  confirmButtonText: {
    marginLeft: 8,
    color: "white",
    fontWeight: "500",
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#374151",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  continueButtonText: {
    marginRight: 8,
    color: "white",
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
})

export default EnvelopeShuffle
