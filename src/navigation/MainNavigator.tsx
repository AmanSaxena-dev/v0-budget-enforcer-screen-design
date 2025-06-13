import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { Ionicons } from "@expo/vector-icons"

import DashboardScreen from "../screens/DashboardScreen"
import HistoryScreen from "../screens/HistoryScreen"
import PlanningScreen from "../screens/PlanningScreen"
import ProfileScreen from "../screens/ProfileScreen"
import PurchaseSimulatorScreen from "../screens/PurchaseSimulatorScreen"
import StatusScreen from "../screens/StatusScreen"
import EnvelopeShuffleScreen from "../screens/EnvelopeShuffleScreen"
import NewEnvelopeScreen from "../screens/NewEnvelopeScreen"

const Tab = createBottomTabNavigator()
const DashboardStack = createNativeStackNavigator()

function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator>
      <DashboardStack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{ headerTitle: "Budget Enforcer" }}
      />
      <DashboardStack.Screen
        name="PurchaseSimulator"
        component={PurchaseSimulatorScreen}
        options={{ headerTitle: "New Purchase" }}
      />
      <DashboardStack.Screen name="Status" component={StatusScreen} options={{ headerTitle: "Purchase Status" }} />
      <DashboardStack.Screen
        name="EnvelopeShuffle"
        component={EnvelopeShuffleScreen}
        options={{ headerTitle: "Envelope Shuffle" }}
      />
      <DashboardStack.Screen
        name="NewEnvelope"
        component={NewEnvelopeScreen}
        options={{ headerTitle: "New Envelope" }}
      />
    </DashboardStack.Navigator>
  )
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline"
          } else if (route.name === "History") {
            iconName = focused ? "time" : "time-outline"
          } else if (route.name === "Planning") {
            iconName = focused ? "calendar" : "calendar-outline"
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Planning" component={PlanningScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
