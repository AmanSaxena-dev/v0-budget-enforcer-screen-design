"use client"

import { useBudget } from "@/context/budgetContext"
import { formatCurrency } from "@/utils/budget-calculator"
import { useState } from "react"
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

export function ShuffleLimits() {
  const { envelopes, shuffleLimits, updateShuffleLimit } = useBudget()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  const handleEdit = (envelopeId: string, currentLimit: number) => {
    setEditingId(envelopeId)
    setEditValue(currentLimit.toString())
  }

  const handleSave = (envelopeId: string) => {
    const value = Number.parseFloat(editValue)
    if (!isNaN(value) && value >= 0) {
      updateShuffleLimit(envelopeId, value)
    }
    setEditingId(null)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Envelope Shuffle Limits</Text>
      </View>

      <View style={styles.content}>
        {envelopes.map((envelope) => {
          const limit = shuffleLimits.find((l) => l.envelopeId === envelope.id)
          const maxAmount = limit?.maxAmount || 0
          const currentShuffled = limit?.currentShuffled || 0
          const percentUsed = maxAmount > 0 ? (currentShuffled / maxAmount) * 100 : 0

          return (
            <View key={envelope.id} style={styles.envelopeCard}>
              <View style={styles.envelopeHeader}>
                <Text style={styles.envelopeName}>{envelope.name}</Text>

                {editingId === envelope.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.input}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="numeric"
                      placeholder="0.00"
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => handleSave(envelope.id)}
                    >
                      <Icon name="check" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.limitContainer}>
                    <Text style={styles.limitAmount}>{formatCurrency(maxAmount)}</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(envelope.id, maxAmount)}
                    >
                      <Icon name="pencil" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>Used: {formatCurrency(currentShuffled)}</Text>
                  <Text style={styles.statsText}>
                    Remaining: {formatCurrency(maxAmount - currentShuffled)}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${percentUsed}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    padding: 16,
  },
  envelopeCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  envelopeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  envelopeName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 100,
    marginRight: 8,
    fontSize: 16,
  },
  saveButton: {
    padding: 4,
  },
  limitContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  limitAmount: {
    fontSize: 16,
    color: "#111827",
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
})
