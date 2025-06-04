"use client"

import { View, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import WelcomeScreenV2 from "../src/components/WelcomeScreenV2"

export default function WelcomeScreen() {
  const router = useRouter()

  const handleComplete = () => {
    router.replace("/(tabs)")
  }

  return (
    <View style={styles.container}>
      <WelcomeScreenV2 onComplete={handleComplete} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
