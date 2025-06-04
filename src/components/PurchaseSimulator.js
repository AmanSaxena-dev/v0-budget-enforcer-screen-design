"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import RNPickerSelect from "react-native-picker-select"
import { useBudget } from "../context/BudgetContext"
import { formatCurrency } from "../utils/budgetCalculator"

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
    Alert.alert("Barcode Scanner", "Barcode scanning would be implemented here")
  }

  if (showStatusScreen) {
    return null
  }

  const envelopeOptions = envelopes.map((envelope) => ({
    label: `${envelope.name} (${formatCurrency(envelope.allocation - envelope.spent)} remaining)`,
    value: envelope.id,
  }))

  return (
    <View style={styles.card}>
      <Text style={styles.title}>What do you want to buy?</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Envelope *</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => {
                const envelope = envelopes.find((env) => env.id === value)
                if (envelope) {
                  setCurrentEnvelope(envelope)
                  resetSimulation()
                }
              }}
              items={envelopeOptions}
              value={currentEnvelope?.id || ""}
              style={pickerSelectStyles}
              placeholder={{ label: "Select an envelope", value: null }}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
            editable={!currentPurchase}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Item/SKU <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.itemInputContainer}>
            <TextInput
              style={[styles.input, styles.itemInput]}
              value={item}
              onChangeText={setItem}
              placeholder="Enter item name or SKU"
              editable={!currentPurchase}
            />
            <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode} disabled={!!currentPurchase}>
              <Ionicons name="scan-outline" size={20} color="#007AFF" />
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
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  optional: {
    fontSize: 12,
    color: "#666",
    fontWeight: "normal",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  itemInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  itemInput: {
    flex: 1,
  },
  scanButton: {
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: "black",
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "black",
    paddingRight: 30,
  },
})
