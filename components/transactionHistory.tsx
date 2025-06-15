"use client"

import { useBudget } from "@/context/budgetContext"
import { formatCurrency } from "@/utils/budget-calculator"
import { format } from "date-fns"
import React, { useState } from "react"
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

export function TransactionHistory() {
  const { purchases, shuffleTransactions, envelopes } = useBudget()
  const [activeTab, setActiveTab] = useState("purchases")

  // Sort transactions by date (newest first)
  const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const sortedShuffles = [...shuffleTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  // Get envelope name by ID
  const getEnvelopeName = (id: string) => {
    const envelope = envelopes.find((env) => env.id === id)
    return envelope ? envelope.name : "Unknown"
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction History</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "purchases" && styles.activeTab]}
          onPress={() => setActiveTab("purchases")}
        >
          <Text style={[styles.tabText, activeTab === "purchases" && styles.activeTabText]}>Purchases</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "shuffles" && styles.activeTab]}
          onPress={() => setActiveTab("shuffles")}
        >
          <Text style={[styles.tabText, activeTab === "shuffles" && styles.activeTabText]}>Envelope Shuffles</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === "purchases" ? (
          sortedPurchases.length === 0 ? (
            <Text style={styles.emptyText}>No purchases yet</Text>
          ) : (
            <View style={styles.transactionList}>
              {sortedPurchases.map((purchase) => (
                <View key={purchase.id} style={styles.transactionItem}>
                  <View style={styles.iconContainer}>
                    <Icon name="shopping" size={20} color="#007AFF" />
                  </View>
                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionHeader}>
                      <View>
                        <Text style={styles.itemName}>{purchase.item || "Purchase"}</Text>
                        <Text style={styles.envelopeName}>{getEnvelopeName(purchase.envelopeId)}</Text>
                      </View>
                      <View style={styles.amountContainer}>
                        <Text style={styles.amount}>{formatCurrency(purchase.amount)}</Text>
                        <Text style={styles.date}>
                          {format(new Date(purchase.date), "MMM d, yyyy")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        ) : (
          sortedShuffles.length === 0 ? (
            <Text style={styles.emptyText}>No envelope shuffles yet</Text>
          ) : (
            <View style={styles.transactionList}>
              {sortedShuffles.map((shuffle) => {
                const targetEnvelope = getEnvelopeName(shuffle.targetEnvelopeId)
                const totalAmount = shuffle.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)

                return (
                  <View key={shuffle.id} style={styles.shuffleItem}>
                    <View style={styles.shuffleHeader}>
                      <View style={styles.iconContainer}>
                        <Icon name="swap-horizontal" size={20} color="#007AFF" />
                      </View>
                      <View style={styles.shuffleDetails}>
                        <View style={styles.shuffleTitleRow}>
                          <Text style={styles.shuffleTitle}>Envelope Shuffle</Text>
                          <Text style={styles.date}>
                            {format(new Date(shuffle.date), "MMM d, yyyy")}
                          </Text>
                        </View>
                        <Text style={styles.shuffleSummary}>
                          Moved {formatCurrency(totalAmount)} to {targetEnvelope}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sourcesContainer}>
                      <Text style={styles.sourcesTitle}>Sources:</Text>
                      {shuffle.allocations.map((alloc, index) => (
                        <View key={index} style={styles.sourceRow}>
                          <Text style={styles.sourceName}>{getEnvelopeName(alloc.envelopeId)}</Text>
                          <Text style={styles.sourceAmount}>{formatCurrency(alloc.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          )
        )}
      </ScrollView>
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
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    padding: 16,
  },
  transactionList: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  envelopeName: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  shuffleItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  shuffleHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  shuffleDetails: {
    flex: 1,
  },
  shuffleTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shuffleTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  shuffleSummary: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
  },
  sourcesContainer: {
    marginLeft: 48,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  sourceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sourceName: {
    fontSize: 14,
    color: "#6B7280",
  },
  sourceAmount: {
    fontSize: 14,
    color: "#6B7280",
  },
})
