"use client"

import { useState, useMemo } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "@/utils/budget-calculator"
import type { ShuffleAllocation, ShuffleStrategy } from "@/types/budget"

interface EnvelopeShuffleProps {
  onCancel: () => void
  onComplete: () => void
}

export function EnvelopeShuffle({ onCancel, onComplete }: EnvelopeShuffleProps) {
  const { envelopes, currentEnvelope, currentPurchase, shuffleEnvelopes } = useBudget()
  const [strategy, setStrategy] = useState<ShuffleStrategy>("manual")
  const [allocations, setAllocations] = useState<ShuffleAllocation[]>([])
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
  const initializeAllocations = (newStrategy: ShuffleStrategy) => {
    if (!currentEnvelope || !currentPurchase || availableEnvelopes.length === 0) return

    let newAllocations: ShuffleAllocation[] = []

    switch (newStrategy) {
      case "manual":
        // Start with zero allocations for manual mode
        newAllocations = availableEnvelopes.map((env) => ({
          envelopeId: env.id,
          amount: 0,
        }))
        break

      case "reduce-from-all":
        // Calculate proportional allocations based on remaining balances
        const totalRemaining = availableEnvelopes.reduce((sum, env) => sum + (env.allocation - env.spent), 0)

        newAllocations = availableEnvelopes.map((env) => {
          const remaining = env.allocation - env.spent
          const proportion = remaining / totalRemaining
          const amount = Math.min(remaining, amountNeeded * proportion)
          return {
            envelopeId: env.id,
            amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
          }
        })
        break

      case "recommended":
        // Prioritize envelopes with the most remaining funds
        const sortedEnvelopes = [...availableEnvelopes].sort((a, b) => {
          // First prioritize envelopes with previous remaining balances
          const aPrevRemaining = a.previousRemaining || 0
          const bPrevRemaining = b.previousRemaining || 0

          if (aPrevRemaining > 0 && bPrevRemaining === 0) return -1
          if (aPrevRemaining === 0 && bPrevRemaining > 0) return 1

          // Then prioritize by current remaining balance
          const aRemaining = a.allocation - a.spent
          const bRemaining = b.allocation - b.spent
          return bRemaining - aRemaining
        })

        // Allocate from envelopes in order until we've covered the amount needed
        let remainingToAllocate = amountNeeded
        newAllocations = []

        for (const env of sortedEnvelopes) {
          if (remainingToAllocate <= 0) break

          const available = env.allocation - env.spent
          const toTake = Math.min(available, remainingToAllocate)

          if (toTake > 0) {
            newAllocations.push({
              envelopeId: env.id,
              amount: Math.round(toTake * 100) / 100, // Round to 2 decimal places
            })
            remainingToAllocate -= toTake
          }
        }
        break
    }

    setAllocations(newAllocations)
  }

  // Update allocation for a specific envelope
  const updateAllocation = (envelopeId: string, amount: number) => {
    const newAllocations = allocations.map((allocation) => {
      if (allocation.envelopeId === envelopeId) {
        return { ...allocation, amount }
      }
      return allocation
    })
    setAllocations(newAllocations)
  }

  // Handle strategy change
  const handleStrategyChange = (newStrategy: ShuffleStrategy) => {
    setStrategy(newStrategy)
    initializeAllocations(newStrategy)
  }

  // Handle confirm button click
  const handleConfirm = () => {
    if (totalAllocated < amountNeeded) {
      alert(`You still need to allocate ${formatCurrency(remainingNeeded)} more.`)
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

  // If we're confirming, show the confirmation screen
  if (isConfirming) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsConfirming(false)}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Envelope Shuffle</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.confirmationText}>
            You are about to move {formatCurrency(totalAllocated)} from other envelopes to your{" "}
            <Text style={styles.bold}>{currentEnvelope.name}</Text> envelope to cover your purchase of{" "}
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
                  <View key={allocation.envelopeId} style={styles.impactCard}>
                    <View style={styles.impactHeader}>
                      <Text style={styles.impactEnvelopeName}>{envelope.name}</Text>
                      <View style={styles.impactAmount}>
                        <Text style={styles.impactAmountText}>{formatCurrency(allocation.amount)}</Text>
                        <Text style={styles.impactAmountLabel}>will be taken</Text>
                      </View>
                    </View>

                    {/* Before shuffle */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Current</Text>
                        <Text style={styles.progressValue}>{formatCurrency(currentRemaining)} remaining</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${currentPercentUsed}%` }]} />
                      </View>
                      <View style={styles.progressFooter}>
                        <Text style={styles.progressText}>{formatCurrency(envelope.spent)} spent</Text>
                        <Text style={styles.progressText}>{formatCurrency(envelope.allocation)} total</Text>
                      </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                      <Ionicons name="arrow-down" size={20} color="#666" />
                    </View>

                    {/* After shuffle */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>After shuffle</Text>
                        <Text style={styles.progressValue}>{formatCurrency(newRemaining)} remaining</Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[styles.progressFill, styles.progressFillWarning, { width: `${newPercentUsed}%` }]}
                        />
                      </View>
                      <View style={styles.progressFooter}>
                        <Text style={styles.progressText}>{formatCurrency(envelope.spent)} spent</Text>
                        <Text style={styles.progressText}>
                          {formatCurrency(envelope.allocation - allocation.amount)} total
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => setIsConfirming(false)}>
            <Ionicons name="arrow-back" size={16} color="#666" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleFinalConfirm}>
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.confirmButtonText}>Confirm Shuffle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envelope Shuffle</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            You need {formatCurrency(amountNeeded)} more to cover your purchase of{" "}
            {formatCurrency(currentPurchase.amount)}
            {currentPurchase.item ? ` for ${currentPurchase.item}` : ""}.
          </Text>
          <Text style={styles.descriptionSubtext}>Choose how you want to shuffle money from other envelopes.</Text>
        </View>

        <View style={styles.strategySection}>
          <Text style={styles.sectionTitle}>Strategy</Text>
          {[
            { value: "manual", label: "Manual Selection" },
            { value: "reduce-from-all", label: "Reduce From All" },
            { value: "recommended", label: "Recommended" },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.strategyOption, strategy === option.value && styles.strategyOptionSelected]}
              onPress={() => handleStrategyChange(option.value as ShuffleStrategy)}
            >
              <View style={[styles.radio, strategy === option.value && styles.radioSelected]}>
                {strategy === option.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.strategyLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.envelopesSection}>
          <View style={styles.envelopesHeader}>
            <Text style={styles.sectionTitle}>Available Envelopes</Text>
            <Text style={styles.allocationStatus}>
              <Text style={styles.bold}>
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
                  <View key={envelope.id} style={styles.envelopeCard}>
                    <View style={styles.envelopeHeader}>
                      <View style={styles.envelopeInfo}>
                        <Text style={styles.envelopeName}>{envelope.name}</Text>
                        <Text style={styles.envelopeAvailable}>{formatCurrency(remaining)} available</Text>
                      </View>
                      {strategy === "manual" && (
                        <View style={styles.amountInputContainer}>
                          <TextInput
                            style={styles.amountInput}
                            value={allocation?.amount?.toString() || "0"}
                            onChangeText={(text) => {
                              const value = Number.parseFloat(text)
                              if (!isNaN(value) && value >= 0 && value <= maxAmount) {
                                updateAllocation(envelope.id, value)
                              }
                            }}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                        </View>
                      )}
                      {strategy !== "manual" && allocation && (
                        <View style={styles.allocationDisplay}>
                          <Text style={styles.allocationAmount}>{formatCurrency(allocation.amount)}</Text>
                        </View>
                      )}
                    </View>

                    {/* Progress bar showing impact */}
                    {allocation && allocation.amount > 0 && (
                      <View style={styles.progressImpact}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Current usage</Text>
                          <Text style={styles.progressValue}>{Math.round(percentUsed)}%</Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${percentUsed}%` }]} />
                        </View>

                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>After shuffle</Text>
                          <Text style={styles.progressValue}>{Math.round(newPercentUsed)}%</Text>
                        </View>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              newPercentUsed > 80 ? styles.progressFillWarning : styles.progressFillNormal,
                              { width: `${newPercentUsed}%` },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    {envelope.previousRemaining && envelope.previousRemaining > 0 && (
                      <Text style={styles.previousRemaining}>
                        Had {formatCurrency(envelope.previousRemaining)} remaining last period
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (totalAllocated < amountNeeded || availableEnvelopes.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={totalAllocated < amountNeeded || availableEnvelopes.length === 0}
        >
          <Ionicons name="arrow-forward" size={16} color="white" />
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  descriptionSubtext: {
    fontSize: 14,
    color: "#666",
  },
  strategySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  strategyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "white",
  },
  strategyOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: "#007AFF",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
  },
  strategyLabel: {
    fontSize: 16,
    color: "#333",
  },
  envelopesSection: {
    marginBottom: 24,
  },
  envelopesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  allocationStatus: {
    fontSize: 14,
    color: "#666",
  },
  bold: {
    fontWeight: "600",
  },
  noEnvelopesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  envelopesList: {
    gap: 12,
  },
  envelopeCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  envelopeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  envelopeInfo: {
    flex: 1,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  envelopeAvailable: {
    fontSize: 14,
    color: "#666",
  },
  amountInputContainer: {
    alignItems: "center",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: "center",
  },
  allocationDisplay: {
    alignItems: "flex-end",
  },
  allocationAmount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  progressImpact: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: "#666",
  },
  progressValue: {
    fontSize: 12,
    color: "#666",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 3,
  },
  progressFillNormal: {
    backgroundColor: "#007AFF",
  },
  progressFillWarning: {
    backgroundColor: "#f59e0b",
  },
  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  previousRemaining: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
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
  continueButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#666",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmationText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  impactCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  impactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  impactEnvelopeName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  impactAmount: {
    alignItems: "flex-end",
  },
  impactAmountText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  impactAmountLabel: {
    fontSize: 12,
    color: "#666",
  },
  progressSection: {
    marginBottom: 8,
  },
  arrowContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
})
