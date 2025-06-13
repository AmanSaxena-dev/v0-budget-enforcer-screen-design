"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type User = {
  id: string
  name: string
  email: string
}

type AuthContextType = {
  user: User | null
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, name: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Check for stored user on app load
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error("Failed to load user from storage", error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadUser()
  }, [])

  const login = async (email: string, password: string) => {
    // In a real app, you would validate credentials with an API
    if (email === "demo@example.com" && password === "password123") {
      const newUser = {
        id: "1",
        name: "Demo User",
        email: "demo@example.com",
      }

      setUser(newUser)
      await AsyncStorage.setItem("user", JSON.stringify(newUser))
    } else {
      throw new Error("Invalid email or password")
    }
  }

  const signup = async (email: string, name: string, password: string) => {
    // In a real app, you would register with an API
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
    }

    setUser(newUser)
    await AsyncStorage.setItem("user", JSON.stringify(newUser))
  }

  const logout = async () => {
    setUser(null)
    await AsyncStorage.removeItem("user")
  }

  return <AuthContext.Provider value={{ user, isInitialized, login, signup, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
