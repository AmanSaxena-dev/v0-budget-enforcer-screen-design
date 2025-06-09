"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency, formatDaysWorth } from "@/utils/budget-calculator"
import { NewEnvelopeForm } from "./NewEnvelopeForm"

export function EnvelopeList() {
  const { envelopes, setCurrentEnvelope } = useBudget()
  const [showNewEnvelopeForm, setShowNewEnvelopeForm] = useState(false)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Envelopes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowNewEnvelopeForm(true)}>
          <Ionicons name="add" size={16} color="#007AFF" />
          <Text style={styles.addButtonText}>New Envelope</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {envelopes.map((envelope) => {
          const dailyAmount = envelope.allocation / envelope.periodLength
          const daysWorth = envelope.spent / dailyAmount
          const percentSpent = (envelope.spent / envelope.allocation) * 100

          // Determine progress bar color based on envelope status
          let progressColor = "#22c55e"
          if (envelope.color.includes("#f59e0b")) {
            progressColor = "#f59e0b"
          } else if (envelope.color.includes("#ea580c")) {
            progressColor = "#ea580c"
          } else if (envelope.color.includes("#dc2626")) {
            progressColor = "#dc2626"
          }

          // Border color based on status
          let borderColor = "#dcfce7"
          if (envelope.color.includes("#f59e0b")) {
            borderColor = "#fef3c7"
          } else if (envelope.color.includes("#ea580c")) {
            borderColor = "#fed7aa"
          } else if (envelope.color.includes("#dc2626")) {
            borderColor = "#fecaca"
          }

          return (
            <TouchableOpacity
              key={envelope.id}
              style={[styles.envelopeCard, { borderColor }]}
              onPress={() => setCurrentEnvelope(envelope)}
            >
              <View style={styles.envelopeContent}>
                {/* Left side: Envelope name and total */}
                <View style={styles.envelopeInfo}>
                  <Text style={styles.envelopeName}>{envelope.name}</Text>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(envelope.allocation)}</Text>
                  </View>
                </View>

                {/* Right side: Progress bar and amounts */}
                <View style={styles.progressSection}>
                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(percentSpent, 100)}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Spent and remaining amounts */}
                  <View style={styles.amountRow}>
                    <View style={styles.spentInfo}>
                      <Text style={styles.amountText}>{formatCurrency(envelope.spent)}</Text>
                      <Text style={styles.daysText}>({formatDaysWorth(daysWorth)})</Text>
                    </View>
                    <View style={styles.remainingInfo}>
                      <Text style={styles.amountText}>{formatCurrency(envelope.allocation - envelope.spent)}</Text>
                      <Text style={styles.remainingLabel}>left</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <Modal visible={showNewEnvelopeForm} animationType="slide" presentationStyle="pageSheet">
        <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  envelopeCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  envelopeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  envelopeInfo: {
    flex: 1,
    marginRight: 16,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 4,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  progressSection: {
    flex: 2,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  spentInfo: {
    alignItems: "flex-start",
  },
  remainingInfo: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  daysText: {
    fontSize: 12,
    color: "#666",
  },
  remainingLabel: {
    fontSize: 12,
    color: "#666",
  },
})
