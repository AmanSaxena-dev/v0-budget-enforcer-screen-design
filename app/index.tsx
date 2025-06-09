"use client"

import { useEffect } from "react"
import { View, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "@/context/authContext"

export default function Index() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace("/auth")
      } else if (!user.hasCompletedSetup) {
        router.replace("/setup")
      } else {
        router.replace("/(tabs)")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return null
}
