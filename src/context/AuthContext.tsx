"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { UserPreferences } from "../types/budget"

export interface User {
  id: string
  email: string
  name: string
  preferences: UserPreferences | null
  hasCompletedSetup: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, name: string, password: string) => Promise<void>
  updateUserPreferences: (preferences: UserPreferences) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user database keys
const MOCK_USERS_KEY = "budget_enforcer_users"
const CURRENT_USER_KEY = "budget_enforcer_current_user"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Ensure there's a default user in the mock database
  useEffect(() => {
    const setupDefaultUser = async () => {
      try {
        const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
        let users = []

        if (usersJson) {
          users = JSON.parse(usersJson)
        }

        // Add a default user if no users exist
        if (users.length === 0) {
          const nextPayday = new Date()
          nextPayday.setDate(nextPayday.getDate() + 3) // 3 days from now

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
          console.log("Default user created with email: demo@example.com and password: password123")
        }
      } catch (error) {
        console.error("Error setting up default user:", error)
      }
    }

    setupDefaultUser()
  }, [])

  // Load user on initial render
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(CURRENT_USER_KEY)
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          // Convert date strings back to Date objects
          if (parsedUser.preferences?.firstPeriodStart) {
            parsedUser.preferences.firstPeriodStart = new Date(parsedUser.preferences.firstPeriodStart)
          }
          if (parsedUser.preferences?.nextPayday) {
            parsedUser.preferences.nextPayday = new Date(parsedUser.preferences.nextPayday)
          }
          setUser(parsedUser)
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error)
        await AsyncStorage.removeItem(CURRENT_USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      // Get users from AsyncStorage
      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []

      // Find user with matching email and password
      const foundUser = users.find((u: any) => u.email === email && u.password === password)

      if (!foundUser) {
        throw new Error("Invalid email or password")
      }

      // Remove password before storing in state
      const { password: _, ...userWithoutPassword } = foundUser

      // Convert date strings back to Date objects
      if (userWithoutPassword.preferences?.firstPeriodStart) {
        userWithoutPassword.preferences.firstPeriodStart = new Date(userWithoutPassword.preferences.firstPeriodStart)
      }
      if (userWithoutPassword.preferences?.nextPayday) {
        userWithoutPassword.preferences.nextPayday = new Date(userWithoutPassword.preferences.nextPayday)
      }

      // Save user to state and AsyncStorage
      setUser(userWithoutPassword)
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword))
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, name: string, password: string) => {
    setIsLoading(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      // Get existing users
      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []

      // Check if user already exists
      if (users.some((u: any) => u.email === email)) {
        throw new Error("User with this email already exists")
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        name,
        password, // In a real app, this would be hashed
        hasCompletedSetup: false,
        preferences: null,
      }

      // Add to users array and save
      users.push(newUser)
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))

      // Remove password before storing in state
      const { password: _, ...userWithoutPassword } = newUser

      // Save user to state and AsyncStorage
      setUser(userWithoutPassword)
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword))
    } catch (error) {
      console.error("Signup failed:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const updateUserPreferences = async (preferences: UserPreferences) => {
    if (!user) return

    const updatedUser = {
      ...user,
      preferences,
      hasCompletedSetup: true,
    }

    setUser(updatedUser)
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser))

    // Also update in the users database
    try {
      const usersJson = await AsyncStorage.getItem(MOCK_USERS_KEY)
      const users = usersJson ? JSON.parse(usersJson) : []
      const userIndex = users.findIndex((u: any) => u.id === user.id)

      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], preferences, hasCompletedSetup: true }
        await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
      }
    } catch (error) {
      console.error("Error updating user preferences:", error)
    }
  }

  const logout = async () => {
    setUser(null)
    await AsyncStorage.removeItem(CURRENT_USER_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, updateUserPreferences, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
