"use client"
import { useAuth } from "@/context/auth-context"
import { BudgetProvider, useBudget } from "@/context/budget-context"
import { AuthProvider } from "@/context/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { SignupFlow } from "@/components/auth/signup-flow"
import BudgetStatusScreen from "@/components/budget-status-screen"
import PurchaseSimulator from "@/components/purchase-simulator"
import { PeriodInfo } from "@/components/period-info"
import { EnvelopeList } from "@/components/envelope-list"
import { TransactionHistory } from "@/components/transaction-history"
import { ShuffleLimits } from "@/components/shuffle-limits"
import { PeriodPlannerV2 } from "@/components/period-planner-v2"
import { WelcomeScreenV2 } from "@/components/welcome-screen-v2"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, User } from "lucide-react"
import type { UserPreferences } from "@/types/budget"

function BudgetContent() {
  const { hasActiveBudget } = useBudget()

  if (!hasActiveBudget) {
    return <WelcomeScreenV2 />
  }

  return (
    <div className="space-y-6">
      <PeriodInfo />

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <EnvelopeList />
            </div>
            <div>
              <PurchaseSimulator />
            </div>
          </div>

          <div className="mt-6">
            <BudgetStatusScreen />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TransactionHistory />
            <ShuffleLimits />
          </div>
        </TabsContent>

        <TabsContent value="planning" className="mt-6">
          <PeriodPlannerV2 />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AppContent() {
  const { user, logout, updateUserPreferences } = useAuth()

  if (!user) {
    return <LoginForm />
  }

  if (!user.hasCompletedSetup) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <SignupFlow
          onComplete={(preferences: Omit<UserPreferences, "autoCreatePeriods">) => {
            updateUserPreferences({
              ...preferences,
              autoCreatePeriods: true,
            })
          }}
        />
      </div>
    )
  }

  return (
    <BudgetProvider>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Budget Enforcer</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                <span>{user.name}</span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>

          <BudgetContent />
        </div>
      </div>
    </BudgetProvider>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
