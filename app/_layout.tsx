import { Stack } from "expo-router"
import { AuthProvider } from "@/context/authContext"
import { BudgetProvider } from "@/context/budgetContext"

export default function RootLayout() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </BudgetProvider>
    </AuthProvider>
  )
}
