"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal } from "react-native"
import { useBudget } from "@/context/budgetContext"
import { Ionicons } from "@expo/vector-icons"
import { formatCurrency } from "@/utils/budget-calculator"
import RNPickerSelect from "react-native-picker-select"
import { NewEnvelopeForm } from "./NewEnvelopeForm"

export function PurchaseSimulator() {
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
    Alert.alert("Barcode Scanner", "Barcode scanning would be implemented here")
  }

  if (showStatusScreen) {
    return null // Hide the simulator when showing status screen
  }

  const pickerItems = [
    ...envelopes.map((envelope) => ({
      label: `${envelope.name} (${formatCurrency(envelope.allocation - envelope.spent)} remaining)`,
      value: envelope.id,
    })),
    {
      label: "+ New Envelope",
      value: "new",
    },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>What do you want to buy?</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Envelope *</Text>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
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
                items={pickerItems}
                value={currentEnvelope?.id || ""}
                placeholder={{
                  label: "Select an envelope",
                  value: null,
                }}
                style={{
                  inputIOS: styles.pickerInput,
                  inputAndroid: styles.pickerInput,
                  placeholder: styles.pickerPlaceholder,
                }}
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
                style={[styles.input, styles.itemInput]}
                value={item}
                onChangeText={setItem}
                placeholder="Enter item name or SKU"
                editable={!currentPurchase}
              />
              <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode} disabled={!!currentPurchase}>
                <Ionicons name="scan" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.simulateButton, (!amount || !currentEnvelope || !!currentPurchase) && styles.buttonDisabled]}
            onPress={handleSimulate}
            disabled={!amount || !currentEnvelope || !!currentPurchase}
          >
            <Text style={styles.simulateButtonText}>Check Purchase Impact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showNewEnvelopeForm} animationType="slide" presentationStyle="pageSheet">
        <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
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
    fontSize: 14,
    color: "#666",
    fontWeight: "normal",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "white",
  },
  pickerInput: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#333",
  },
  pickerPlaceholder: {
    color: "#999",
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
  itemInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  itemInput: {
    flex: 1,
  },
  scanButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  simulateButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  simulateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})
