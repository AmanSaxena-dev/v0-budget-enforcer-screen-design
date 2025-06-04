import { StyleSheet, SafeAreaView } from "react-native"
import { useBudget } from "../context/BudgetContext"
import WelcomeScreenV2 from "../components/WelcomeScreenV2"

export default function WelcomeScreen({ navigation }) {
  const { hasActiveBudget } = useBudget()

  if (hasActiveBudget) {
    navigation.navigate("Main")
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <WelcomeScreenV2 onComplete={() => navigation.navigate("Main")} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
})
