"use client"

import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

const AuthContext = createContext()

const MOCK_USERS_KEY = "budget_enforcer_users"
const CURRENT_USER_KEY = "budget_enforcer_current_user"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeDefaultUser()
    loadUser()
  }, [])

  const initializeDefaultUser = async () => {
    try {
      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []

      if (users.length === 0) {
        const nextPayday = new Date()
        nextPayday.setDate(nextPayday.getDate() + 3)

        const defaultUser = {
          id: "user_default",
          email: "demo@example.com",
          name: "Demo User",
          password: "password123",
          hasCompletedSetup: true,
          preferences: {
            periodLength: 14,
            firstPeriodStart: new Date(),
            firstPeriodLength: 3,
            nextPayday,
            paycheckAmount: 2500,
            paycheckFrequency: "biweekly",
            autoCreatePeriods: true,
          },
        }

        users.push(defaultUser)
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
      }
    } catch (error) {
      console.error("Failed to initialize default user:", error)
    }
  }

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(CURRENT_USER_KEY)
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.preferences?.firstPeriodStart) {
          parsedUser.preferences.firstPeriodStart = new Date(parsedUser.preferences.firstPeriodStart)
        }
        if (parsedUser.preferences?.nextPayday) {
          parsedUser.preferences.nextPayday = new Date(parsedUser.preferences.nextPayday)
        }
        setUser(parsedUser)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email, password) => {
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []

      const foundUser = users.find((u) => u.email === email && u.password === password)

      if (!foundUser) {
        throw new Error("Invalid email or password")
      }

      const { password: _, ...userWithoutPassword } = foundUser

      if (userWithoutPassword.preferences?.firstPeriodStart) {
        userWithoutPassword.preferences.firstPeriodStart = new Date(userWithoutPassword.preferences.firstPeriodStart)
      }
      if (userWithoutPassword.preferences?.nextPayday) {
        userWithoutPassword.preferences.nextPayday = new Date(userWithoutPassword.preferences.nextPayday)
      }

      setUser(userWithoutPassword)
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword))
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email, name, password) => {
    setIsLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []

      if (users.some((u) => u.email === email)) {
        throw new Error("User with this email already exists")
      }

      const newUser = {
        id: `user_${Date.now()}`,
        email,
        name,
        password,
        hasCompletedSetup: false,
        preferences: null,
      }

      users.push(newUser)
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))

      const { password: _, ...userWithoutPassword } = newUser
      setUser(userWithoutPassword)
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword))
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserPreferences = async (preferences) => {
    if (!user) return

    const updatedUser = {
      ...user,
      preferences,
      hasCompletedSetup: true,
    }

    setUser(updatedUser)
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser))

    const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
    const users = JSON.parse(usersJson)
    const userIndex = users.findIndex((u) => u.id === user.id)

    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], preferences, hasCompletedSetup: true }
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
    }
  }

  const logout = async () => {
    setUser(null)
    await AsyncStorage.removeItem(CURRENT_USER_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        updateUserPreferences,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
