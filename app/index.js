"use client"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { useRouter, Redirect } from "expo-router"
import { useAuth } from "../src/context/AuthContext"
import { useBudget } from "../src/context/BudgetContext"

export default function Index() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentPeriod, isLoading: budgetLoading } = useBudget()
  const router = useRouter()

  const isLoading = authLoading || budgetLoading

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  if (!user) {
    return <Redirect href="/auth" />
  }

  if (user && !user.preferences) {
    return <Redirect href="/signup-flow" />
  }

  if (user && user.preferences && !currentPeriod) {
    return <Redirect href="/welcome" />
  }

  return <Redirect href="/(tabs)" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
})
