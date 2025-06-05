"use client"

import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user")
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch (error) {
      console.error("Error loading user:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    // Simulate login
    const userData = {
      id: "1",
      email,
      name: email.split("@")[0],
      hasCompletedSetup: false,
      preferences: null,
    }

    await AsyncStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = async () => {
    await AsyncStorage.removeItem("user")
    await AsyncStorage.removeItem("budgetData")
    setUser(null)
  }

  const updateUserPreferences = async (preferences) => {
    const updatedUser = {
      ...user,
      hasCompletedSetup: true,
      preferences,
    }

    await AsyncStorage.setItem("user", JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    updateUserPreferences,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
