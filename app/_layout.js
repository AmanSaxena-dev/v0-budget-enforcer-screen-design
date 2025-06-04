import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthProvider } from "../src/context/AuthContext"
import { BudgetProvider } from "../src/context/BudgetContext"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <BudgetProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#f5f5f5" },
              animation: "slide_from_right",
            }}
          />
        </BudgetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
