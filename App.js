"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { AuthProvider } from "./src/context/AuthContext"
import { BudgetProvider } from "./src/context/BudgetContext"
import AuthScreen from "./src/screens/AuthScreen"
import SignupFlowScreen from "./src/screens/SignupFlowScreen"
import WelcomeScreen from "./src/screens/WelcomeScreen"
import MainTabNavigator from "./src/navigation/MainTabNavigator"
import { useAuth } from "./src/context/AuthContext"

const Stack = createStackNavigator()

function AppNavigator() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null // You could add a loading screen here
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    )
  }

  if (!user.hasCompletedSetup) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignupFlow" component={SignupFlowScreen} />
      </Stack.Navigator>
    )
  }

  return (
    <BudgetProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </BudgetProvider>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
