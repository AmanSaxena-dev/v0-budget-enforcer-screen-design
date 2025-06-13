import { View, Text, StyleSheet, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useBudget } from "../context/BudgetContext"
import PurchaseSimulator from "../components/PurchaseSimulator"
import BudgetStatusScreen from "../components/BudgetStatusScreen"
import EnvelopeList from "../components/EnvelopeList"

export default function HomeScreen() {
  const { showStatusScreen } = useBudget()

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Budget Enforcer</Text>

        {showStatusScreen ? (
          <BudgetStatusScreen />
        ) : (
          <View style={styles.content}>
            <PurchaseSimulator />
            <View style={styles.divider} />
            <EnvelopeList />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  content: {
    gap: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
})
