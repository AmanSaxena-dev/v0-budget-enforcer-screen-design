"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency } from "../utils/budgetCalculator"
import NewEnvelopeForm from "./NewEnvelopeForm"

export default function PurchaseSimulator() {
  const {
    envelopes,
    currentEnvelope,
    setCurrentEnvelope,
    simulatePurchase,
    resetSimulation,
    currentPurchase,
    showStatusScreen,
  } = useBudget()

  const [amount, setAmount] = useState("")
  const [item, setItem] = useState("")
  const [showNewEnvelopeForm, setShowNewEnvelopeForm] = useState(false)

  // Set the first envelope as current when component mounts if none is selected
  useEffect(() => {
    if (envelopes.length > 0 && !currentEnvelope) {
      setCurrentEnvelope(envelopes[0])
    }
  }, [envelopes, currentEnvelope, setCurrentEnvelope])

  const handleSimulate = () => {
    if (currentEnvelope && amount) {
      simulatePurchase({
        amount: Number.parseFloat(amount),
        item: item || undefined,
        envelopeId: currentEnvelope.id,
        date: new Date(),
      })
    }
  }

  const handleScanBarcode = () => {
    // In a real app, this would integrate with a barcode scanner
    Alert.alert("Barcode Scanner", "Barcode scanning would be implemented here")
  }

  if (showStatusScreen) {
    return null // Hide the simulator when showing status screen
  }

  if (showNewEnvelopeForm) {
    return <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>What do you want to buy?</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Envelope *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={currentEnvelope?.id || ""}
              onValueChange={(value) => {
                if (value === "new") {
                  setShowNewEnvelopeForm(true)
                } else {
                  const envelope = envelopes.find((env) => env.id === value)
                  if (envelope) {
                    setCurrentEnvelope(envelope)
                    resetSimulation()
                  }
                }
              }}
              style={styles.picker}
            >
              {envelopes.map((envelope) => (
                <Picker.Item
                  key={envelope.id}
                  label={`${envelope.name} (${formatCurrency(envelope.allocation - envelope.spent)} remaining)`}
                  value={envelope.id}
                />
              ))}
              <Picker.Item label="+ New Envelope" value="new" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            editable={!currentPurchase}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Item/SKU <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.itemInputContainer}>
            <TextInput
              style={styles.itemInput}
              value={item}
              onChangeText={setItem}
              placeholder="Enter item name or SKU"
              editable={!currentPurchase}
            />
            <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode} disabled={!!currentPurchase}>
              <Ionicons name="scan-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!amount || !currentEnvelope || !!currentPurchase) && styles.buttonDisabled]}
          onPress={handleSimulate}
          disabled={!amount || !currentEnvelope || !!currentPurchase}
        >
          <Text style={styles.buttonText}>Check Purchase Impact</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  optional: {
    fontSize: 12,
    color: "#94a3b8",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  itemInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  scanButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
})
