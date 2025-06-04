"use client"

import { View, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useAuth } from "../src/context/AuthContext"

export default function AuthScreen() {
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (credentials) => {
    await login(credentials)
    router.replace("/")
  }

  return <View style={styles.container}>{/* Login form component would go here */}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
})
