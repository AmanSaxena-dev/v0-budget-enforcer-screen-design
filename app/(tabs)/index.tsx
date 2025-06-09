import { View, StyleSheet } from "react-native"
import { useBudget } from "../../context/budgetContext"
import {WelcomeScreen}  from "../../components/welcomeScreen"
import {PeriodInfo}  from "../../components/PeriodInfo"
import { EnvelopeList } from "../../components/EnvelopeList"
import { PurchaseSimulator } from "@/components/PurchaseSimulator"
import {BudgetStatusScreen}  from "../../components/BudgetStatusScreen"

export default function DashboardScreen() {
  const { hasActiveBudget } = useBudget()

  if (!hasActiveBudget) {
    return <WelcomeScreen/>
  }

  return (
    <View style={styles.container}>
      <PeriodInfo />
      <View style={styles.content}>
        <EnvelopeList />
        <PurchaseSimulator />
      </View>
      <BudgetStatusScreen />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 16,
  },
})
