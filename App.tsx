import { NavigationContainer } from "@react-navigation/native"
import { StatusBar } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { BudgetProvider } from "./src/context/BudgetContext"
import { AuthProvider } from "./src/context/AuthContext"
import MainNavigator from "./src/navigation/MainNavigator"

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <BudgetProvider>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </BudgetProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
