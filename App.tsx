"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "react-native"
import { AuthProvider } from "./src/context/AuthContext"
import { BudgetProvider } from "./src/context/BudgetContext"
import LoginScreen from "./src/screens/LoginScreen"
import SignupFlowScreen from "./src/screens/SignupFlowScreen"
import MainNavigator from "./src/navigation/MainNavigator"
import { useAuth } from "./src/context/AuthContext"

const Stack = createNativeStackNavigator()

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : !user.hasCompletedSetup ? (
          <Stack.Screen name="SignupFlow" component={SignupFlowScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <BudgetProvider>
          <AppContent />
        </BudgetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
