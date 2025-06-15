import { LoginForm } from "@/components/auth/login-form"
import { SignupFlow } from "@/components/auth/signup-flow"
import { BillsEnvelope } from "@/components/billsEnvelope"
import BudgetStatusScreen from "@/components/BudgetStatusScreen"
import { EnvelopeList } from "@/components/EnvelopeList"
import { PeriodInfo } from "@/components/period-info"
import { PeriodPlannerV2 } from "@/components/periodPlanner"
import PurchaseSimulator from "@/components/purchase-simulator"
import { ShuffleLimits } from "@/components/shuffleLimits"
import { TransactionHistory } from "@/components/transactionHistory"
import { WelcomeScreen } from "@/components/welcomeScreen"
import { AuthProvider, useAuth } from "@/context/authContext"
import { BudgetProvider, useBudget } from "@/context/budgetContext"
import React from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { Button } from "react-native-paper"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"

function BudgetContent() {
  const { hasActiveBudget } = useBudget()
  const [tab, setTab] = React.useState<"dashboard" | "history" | "planning">("dashboard")

  if (!hasActiveBudget) {
    return <WelcomeScreen />
  }

  return (
    <View style={styles.section}>
      <PeriodInfo />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <Button
          mode={tab === "dashboard" ? "contained" : "outlined"}
          onPress={() => setTab("dashboard")}
          style={styles.tabButton}
        >
          Dashboard
        </Button>
        <Button
          mode={tab === "history" ? "contained" : "outlined"}
          onPress={() => setTab("history")}
          style={styles.tabButton}
        >
          History
        </Button>
        <Button
          mode={tab === "planning" ? "contained" : "outlined"}
          onPress={() => setTab("planning")}
          style={styles.tabButton}
        >
          Planning
        </Button>
      </View>

      {tab === "dashboard" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12 }}>
          <BillsEnvelope />
          <View style={styles.dashboardGrid}>
            <View style={styles.dashboardMain}>
              <EnvelopeList />
            </View>
            <View style={styles.dashboardSide}>
              <PurchaseSimulator />
            </View>
          </View>
          <View style={{ marginTop: 24 }}>
            <BudgetStatusScreen />
          </View>
        </ScrollView>
      )}

      {tab === "history" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12 }}>
          <View style={styles.historyGrid}>
            <TransactionHistory />
            <ShuffleLimits />
          </View>
        </ScrollView>
      )}

      {tab === "planning" && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12 }}>
          <PeriodPlannerV2 />
        </ScrollView>
      )}
    </View>
  )
}

function AppContent() {
  const { user, logout, updateUserPreferences } = useAuth()

  if (!user) {
    return <LoginForm />
  }

  if (!user.hasCompletedSetup) {
    return (
      <View style={styles.centeredScreen}>
        <SignupFlow
          onComplete={(preferences) => {
            updateUserPreferences({
              ...preferences,
              autoCreatePeriods: true,
            })
          }}
        />
      </View>
    )
  }

  return (
    <BudgetProvider>
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Budget Enforcer</Text>
          <View style={styles.headerRight}>
            <View style={styles.userRow}>
              <Icon name="account" size={20} color="#374151" style={{ marginRight: 6 }} />
              <Text>{user.name}</Text>
            </View>
            <Button mode="outlined" compact onPress={logout} style={styles.logoutButton}>
              <Icon name="logout" size={18} color="#374151" style={{ marginRight: 4 }} />
              Logout
            </Button>
          </View>
        </View>
        <BudgetContent />
      </ScrollView>
    </BudgetProvider>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  screenContent: {
    flexGrow: 1,
    maxWidth: 900,
    alignSelf: "center",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  logoutButton: {
    marginLeft: 8,
  },
  section: {
    flex: 1,
    marginTop: 8,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  dashboardGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  dashboardMain: {
    flex: 2,
    marginRight: 8,
  },
  dashboardSide: {
    flex: 1,
    marginLeft: 8,
  },
  historyGrid: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  centeredScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9fafb",
  },
})