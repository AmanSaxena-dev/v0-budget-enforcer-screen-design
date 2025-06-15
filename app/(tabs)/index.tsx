import BudgetStatusScreen from "@/components/BudgetStatusScreen"
import { PurchaseSimulator } from "@/components/PurchaseSimulator"
import { StyleSheet, View } from "react-native"
import { EnvelopeList } from "../../components/EnvelopeList"
import { PeriodInfo } from "../../components/PeriodInfo"
import { WelcomeScreen } from "../../components/welcomeScreen"
import { useBudget } from "../../context/budgetContext"

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
