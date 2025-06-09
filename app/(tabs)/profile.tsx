"use client"
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useAuth } from "@/context/authContext"
import { Ionicons } from "@expo/vector-icons"

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#007AFF" />
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {user?.preferences && (
            <View style={styles.preferencesList}>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Paycheck Frequency</Text>
                <Text style={styles.preferenceValue}>
                  {user.preferences.paycheckFrequency.charAt(0).toUpperCase() +
                    user.preferences.paycheckFrequency.slice(1)}
                </Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Period Length</Text>
                <Text style={styles.preferenceValue}>{user.preferences.periodLength} days</Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Next Payday</Text>
                <Text style={styles.preferenceValue}>{user.preferences.nextPayday.toLocaleDateString()}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  preferencesList: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 16,
    color: "#333",
  },
  preferenceValue: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
