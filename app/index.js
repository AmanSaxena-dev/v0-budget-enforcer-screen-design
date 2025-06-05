"use client"

import { useEffect } from "react"
import { useRouter } from "expo-router"
import { View, ActivityIndicator } from "react-native"
import { useAuth } from "../src/context/AuthContext"
import { useBudget } from "../src/context/BudgetContext"

export default function Index() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { hasActiveBudget } = useBudget()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth")
      } else if (!user.hasCompletedSetup) {
        router.replace("/signup-flow")
      } else if (!hasActiveBudget) {
        router.replace("/welcome")
      } else {
        router.replace("/(tabs)")
      }
    }
  }, [user, loading, hasActiveBudget])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return null
}
