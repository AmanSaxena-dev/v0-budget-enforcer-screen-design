import { useBudget } from "@/context/budgetContext"
import type { Bill } from "@/types/budget"
import { formatCurrency } from "@/utils/budget-calculator"
import { format, isBefore } from "date-fns"
import React, { useState } from "react"
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Button, Card } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

export function BillsEnvelope() {
  const { billsEnvelope, addBill, deleteBill, addMoneyToBills } = useBudget()
  const [showAddBill, setShowAddBill] = useState(false)
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [newBill, setNewBill] = useState<Omit<Bill, "id">>({
    name: "",
    amount: 0,
    dueDay: 1,
    isRecurring: true,
    category: "",
  })
  const [addMoneyAmount, setAddMoneyAmount] = useState("")

  if (!billsEnvelope) return null

  const handleAddBill = () => {
    if (newBill.name && newBill.amount > 0) {
      addBill(newBill)
      setNewBill({ name: "", amount: 0, dueDay: 1, isRecurring: true, category: "" })
      setShowAddBill(false)
    }
  }

  const handleAddMoney = () => {
    const amount = Number.parseFloat(addMoneyAmount)
    if (amount > 0) {
      addMoneyToBills(amount)
      setAddMoneyAmount("")
      setShowAddMoney(false)
    }
  }

  const fundingPercentage =
    billsEnvelope.totalMonthlyBills > 0
      ? (billsEnvelope.currentBalance / billsEnvelope.totalMonthlyBills) * 100
      : 100

  const cushionPercentage =
    billsEnvelope.targetAmount > 0
      ? (billsEnvelope.currentBalance / billsEnvelope.targetAmount) * 100
      : 100

  const today = new Date()
  const upcomingBills = billsEnvelope.bills
    .map((bill) => {
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), bill.dueDay)
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, bill.dueDay)
      const dueDate = isBefore(thisMonth, today) ? nextMonth : thisMonth
      return { ...bill, dueDate }
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3)

  return (
    <ScrollView>
      <Card style={styles.card}>
        <Card.Title
          title="Bills Envelope"
          subtitle="Mandatory monthly expenses"
          left={() => (
            <View style={styles.iconCircle}>
              <Icon name="calendar" size={24} color="#2563eb" />
            </View>
          )}
          right={() => (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.balance}>{formatCurrency(billsEnvelope.currentBalance)}</Text>
              <Text style={styles.target}>of {formatCurrency(billsEnvelope.targetAmount)} target</Text>
              <Text style={styles.smallText}>
                ({formatCurrency(billsEnvelope.totalMonthlyBills)} bills + {formatCurrency(billsEnvelope.cushionAmount)} cushion)
              </Text>
            </View>
          )}
        />
        <Card.Content>
          {/* Funding Status */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Monthly Funding Status</Text>
              <View style={[
                styles.badge,
                billsEnvelope.hasReachedCushion
                  ? styles.badgeDefault
                  : billsEnvelope.isFullyFunded
                  ? styles.badgeSecondary
                  : styles.badgeDestructive
              ]}>
                <Icon
                  name={
                    billsEnvelope.hasReachedCushion || billsEnvelope.isFullyFunded
                      ? "check-circle"
                      : "alert"
                  }
                  size={14}
                  color={
                    billsEnvelope.hasReachedCushion || billsEnvelope.isFullyFunded
                      ? "#22c55e"
                      : "#f59e42"
                  }
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>
                  {billsEnvelope.hasReachedCushion
                    ? "Cushioned"
                    : billsEnvelope.isFullyFunded
                    ? "Bills Covered"
                    : "Underfunded"}
                </Text>
              </View>
            </View>
            {/* Progress bars */}
            <ProgressBar label="Bills Coverage" percent={fundingPercentage} color={fundingPercentage >= 100 ? "#22c55e" : fundingPercentage >= 75 ? "#facc15" : "#ef4444"} />
            <ProgressBar label={`Cushion Target (${formatCurrency(billsEnvelope.cushionAmount)} buffer)`} percent={cushionPercentage} color={cushionPercentage >= 100 ? "#2563eb" : "#a1a1aa"} />
            <Text style={styles.smallText}>
              {billsEnvelope.hasReachedCushion
                ? `✓ Cushioned • Maintenance: ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck`
                : `Need ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to reach cushion target`}
            </Text>
          </View>

          {/* Upcoming Bills */}
          {upcomingBills.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming Bills</Text>
              {upcomingBills.map((bill) => (
                <View key={bill.id} style={styles.upcomingBill}>
                  <View>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDue}>Due {format(bill.dueDate, "MMM d")}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                    {bill.category ? <Text style={styles.billCategory}>{bill.category}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* All Bills List */}
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>All Bills ({billsEnvelope.bills.length})</Text>
              <Button mode="outlined" onPress={() => setShowAddBill(true)} icon="plus">
                Add Bill
              </Button>
            </View>
            {showAddBill && (
              <Card style={styles.addBillCard}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Bill Name"
                    value={newBill.name}
                    onChangeText={(text) => setNewBill({ ...newBill, name: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    keyboardType="numeric"
                    value={newBill.amount ? String(newBill.amount) : ""}
                    onChangeText={(text) => setNewBill({ ...newBill, amount: Number.parseFloat(text) || 0 })}
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Due Day"
                    keyboardType="numeric"
                    value={newBill.dueDay ? String(newBill.dueDay) : ""}
                    onChangeText={(text) => setNewBill({ ...newBill, dueDay: Number.parseInt(text) || 1 })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Category (optional)"
                    value={newBill.category}
                    onChangeText={(text) => setNewBill({ ...newBill, category: text })}
                  />
                </View>
                <View style={styles.rowEnd}>
                  <Button mode="outlined" onPress={() => setShowAddBill(false)} style={styles.buttonSmall}>
                    Cancel
                  </Button>
                  <Button onPress={handleAddBill} style={styles.buttonSmall}>
                    Add Bill
                  </Button>
                </View>
              </Card>
            )}
            {billsEnvelope.bills.map((bill) => (
              <View key={bill.id} style={styles.billRow}>
                <View>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billDue}>
                    Due {bill.dueDay}
                    {getDayOrdinal(bill.dueDay)} of each month
                    {bill.category ? ` • ${bill.category}` : ""}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                  <TouchableOpacity onPress={() => deleteBill(bill.id)} style={styles.iconButton}>
                    <Icon name="trash-can-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Add Money Section */}
          <View style={[styles.section, { borderTopWidth: 1, borderColor: "#e5e7eb", paddingTop: 16 }]}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Add Money to Bills</Text>
              <Button mode="outlined" onPress={() => setShowAddMoney(true)} icon="currency-usd">
                Add Money
              </Button>
            </View>
            {showAddMoney && (
              <View style={styles.addMoneyBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Amount to Add"
                  keyboardType="numeric"
                  value={addMoneyAmount}
                  onChangeText={setAddMoneyAmount}
                />
                <View style={styles.rowEnd}>
                  <Button mode="outlined" onPress={() => setShowAddMoney(false)} style={styles.buttonSmall}>
                    Cancel
                  </Button>
                  <Button onPress={handleAddMoney} style={styles.buttonSmall}>
                    Add Money
                  </Button>
                </View>
              </View>
            )}
            {!billsEnvelope.hasReachedCushion && billsEnvelope.requiredPerPaycheck > 0 && (
              <View style={styles.warningBox}>
                <Icon name="alert" size={18} color="#f59e42" style={{ marginRight: 4 }} />
                <Text style={styles.warningText}>
                  {billsEnvelope.isFullyFunded
                    ? `Add ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to build cushion`
                    : `Add ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to cover bills + cushion`}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  )
}

function ProgressBar({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <View style={{ marginVertical: 4 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressPercent}>{percent.toFixed(1)}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBar, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function getDayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return "th"
  switch (day % 10) {
    case 1: return "st"
    case 2: return "nd"
    case 3: return "rd"
    default: return "th"
  }
}

const styles = StyleSheet.create({
  card: { margin: 16, borderColor: "#bfdbfe", borderWidth: 1 },
  iconCircle: { backgroundColor: "#dbeafe", padding: 8, borderRadius: 999, marginRight: 12 },
  balance: { fontSize: 24, fontWeight: "bold" },
  target: { fontSize: 14, color: "#6b7280" },
  smallText: { fontSize: 12, color: "#6b7280" },
  section: { marginVertical: 12 },
  label: { fontSize: 14, fontWeight: "500" },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeDefault: { backgroundColor: "#e0e7ff" },
  badgeSecondary: { backgroundColor: "#f1f5f9" },
  badgeDestructive: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 12, fontWeight: "bold" },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  upcomingBill: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, backgroundColor: "#f9fafb", borderRadius: 8, marginVertical: 2 },
  billName: { fontSize: 14, fontWeight: "500" },
  billDue: { fontSize: 12, color: "#6b7280" },
  billAmount: { fontSize: 14, fontWeight: "500" },
  billCategory: { fontSize: 12, color: "#6b7280", textTransform: "capitalize" },
  inputRow: { flexDirection: "row", gap: 8, marginVertical: 4 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, padding: 8, fontSize: 14, backgroundColor: "#fff" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowEnd: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
  addBillCard: { padding: 12, borderStyle: "dashed", borderWidth: 1, borderColor: "#d1d5db", marginVertical: 8 },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 8, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, marginVertical: 2 },
  iconButton: { marginLeft: 8, padding: 4 },
  addMoneyBox: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12, marginVertical: 8 },
  buttonSmall: { marginLeft: 8 },
  warningBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde68a", borderRadius: 8, padding: 8, marginTop: 8 },
  warningText: { color: "#b45309", fontSize: 14, marginLeft: 4 },
  progressLabel: { fontSize: 12 },
  progressPercent: { fontSize: 12 },
  progressBarBg: { width: "100%", height: 8, backgroundColor: "#e5e7eb", borderRadius: 8, marginTop: 2 },
  progressBar: { height: 8, borderRadius: 8 },
})