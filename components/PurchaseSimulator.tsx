"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native"
import { useBudget } from "../context/budget-context"
import { formatCurrency } from "../utils/budget-calculator"
import { Feather } from "@expo/vector-icons"
import { Picker } from "@react-native-picker/picker"
import { useNavigation } from "@react-navigation/native"

export default function PurchaseSimulator() {
  const { envelopes, currentEnvelope, setCurrentEnvelope, simulatePurchase } = useBudget()
  const navigation = useNavigation()

  const [amount, setAmount] = useState("")
  const [item, setItem] = useState("")

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
    alert("Barcode scanning would be implemented here")
  }

  const handleAddEnvelope = () => {
    navigation.navigate("NewEnvelope" as never)
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>What do you want to buy?</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Envelope *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={currentEnvelope?.id || ""}
              onValueChange={(value) => {
                if (value === "new") {
                  handleAddEnvelope()
                } else {
                  const envelope = envelopes.find((env) => env.id === value)
                  if (envelope) {
                    setCurrentEnvelope(envelope)
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

        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Item/SKU</Text>
            <Text style={styles.optionalText}>(optional)</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.itemInput]}
              value={item}
              onChangeText={setItem}
              placeholder="Enter item name or SKU"
            />
            <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
              <Feather name="camera" size={20} color="#0284c7" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, (!amount || !currentEnvelope) && styles.buttonDisabled]}
          onPress={handleSimulate}
          disabled={!amount || !currentEnvelope}
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemInput: {
    flex: 1,
  },
  scanButton: {
    padding: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
  },
  pickerContainer: {
    height: 200,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "scroll",
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: "#0284c7",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
})
