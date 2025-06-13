"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency, formatDaysWorth } from "../utils/budgetCalculator"
import NewEnvelopeForm from "./NewEnvelopeForm"
import ProgressBar from "./ProgressBar"

export default function EnvelopeList() {
  const { envelopes, setCurrentEnvelope } = useBudget()
  const [showNewEnvelopeForm, setShowNewEnvelopeForm] = useState(false)

  if (showNewEnvelopeForm) {
    return (
      <View style={styles.formContainer}>
        <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Envelopes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowNewEnvelopeForm(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#3b82f6" />
          <Text style={styles.addButtonText}>New Envelope</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.envelopeList}>
        {envelopes.map((envelope) => {
          const dailyAmount = envelope.allocation / envelope.periodLength
          const daysWorth = envelope.spent / dailyAmount
          const percentSpent = (envelope.spent / envelope.allocation) * 100

          // Determine progress bar color based on envelope status
          let progressColor = "#22c55e" // green-500
          if (percentSpent > 80) {
            progressColor = "#f59e0b" // amber-500
          } else if (percentSpent > 90) {
            progressColor = "#f97316" // orange-500
          } else if (percentSpent >= 100) {
            progressColor = "#ef4444" // red-500
          }

          // Border color based on status
          let borderColor = "#dcfce7" // green-100
          if (percentSpent > 80) {
            borderColor = "#fef3c7" // amber-100
          } else if (percentSpent > 90) {
            borderColor = "#ffedd5" // orange-100
          } else if (percentSpent >= 100) {
            borderColor = "#fee2e2" // red-100
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
                  <ProgressBar progress={percentSpent} color={progressColor} style={styles.progressBar} />

                  {/* Spent and remaining amounts */}
                  <View style={styles.amountsRow}>
                    <View>
                      <Text style={styles.amountText}>
                        {formatCurrency(envelope.spent)}{" "}
                        <Text style={styles.daysText}>({formatDaysWorth(daysWorth)})</Text>
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.amountText}>
                        {formatCurrency(envelope.allocation - envelope.spent)} <Text style={styles.daysText}>left</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,\
