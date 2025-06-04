"use client"

import { View, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "../src/context/AuthContext"

export default function SignupFlowScreen() {
  const { updateUserPreferences } = useAuth()
  const router = useRouter()

  const handleComplete = async (preferences) => {
    await updateUserPreferences(preferences)
    router.replace("/")
  }

  return <View style={styles.container}>{/* SignupFlow component would go here */}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
