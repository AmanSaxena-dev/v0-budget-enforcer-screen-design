import { Stack } from "expo-router"
import { AuthProvider } from "../src/context/AuthContext"
import { BudgetProvider } from "../src/context/BudgetContext"

export default function RootLayout() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="signup-flow" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </BudgetProvider>
    </AuthProvider>
  )
}
