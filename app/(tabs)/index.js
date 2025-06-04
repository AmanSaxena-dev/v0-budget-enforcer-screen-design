import { View, ScrollView, StyleSheet, SafeAreaView } from "react-native"
import PeriodInfo from "../../src/components/PeriodInfo"
import EnvelopeList from "../../src/components/EnvelopeList"
import PurchaseSimulator from "../../src/components/PurchaseSimulator"
import BudgetStatusScreen from "../../src/components/BudgetStatusScreen"
import { useBudget } from "../../src/context/BudgetContext"

export default function DashboardScreen() {
  const { showStatusScreen } = useBudget()

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PeriodInfo />
        {showStatusScreen ? (
          <BudgetStatusScreen />
        ) : (
          <View style={styles.mainContent}>
            <EnvelopeList />
            <PurchaseSimulator />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  mainContent: {
    gap: 16,
  },
})
