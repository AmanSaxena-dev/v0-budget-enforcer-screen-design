"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, AlertTriangle, XCircle, Check } from "lucide-react"
import { BudgetProvider } from "@/context/budget-context"
import BudgetStatusScreen from "@/components/budget-status-screen"
import PurchaseSimulator from "@/components/purchase-simulator"
import { PeriodInfo } from "@/components/period-info"
import { EnvelopeList } from "@/components/envelope-list"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState(0)

  const handleYesClick = () => {
    alert("Action confirmed!")
  }

  const handleNoClick = () => {
    alert("Action declined.")
  }

  const screens = [
    {
      icon: <Check className="h-24 w-24 text-white" />,
      text: "Super Safe",
      color: "bg-green-700",
      borderColor: "border-white",
      textColor: "text-white",
      topText: "With this purchase: $7 at Starbucks",
      subtext: "This purchase would keep you at 3 days' worth of spending.",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: false,
      showDivider: true,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
    {
      icon: <ThumbsUp className="h-24 w-24 text-green-500" />,
      text: "On track",
      color: "bg-green-100",
      borderColor: "border-green-500",
      textColor: "text-green-700",
      topText: "With this purchase: $23 on Chipotle",
      subtext: "This purchase would bring you to 4 days' worth of spending.",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: false,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
    {
      icon: <AlertTriangle className="h-24 w-24 text-amber-500" />,
      text: "Caution",
      color: "bg-amber-100",
      borderColor: "border-amber-500",
      textColor: "text-amber-700",
      topText: "With this purchase: $74 on Door Dash",
      subtext: "This purchase would bring you to 6 days' worth of spending.",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: false,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
    {
      icon: <AlertTriangle className="h-24 w-24 text-orange-600" />,
      text: "Danger",
      color: "bg-orange-200",
      borderColor: "border-orange-600",
      textColor: "text-orange-800",
      topText: "With this purchase: $98 on UberEats",
      subtext: "This purchase would bring you to 7 days' worth of spending.",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: false,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
    {
      icon: <ThumbsDown className="h-24 w-24 text-red-500" />,
      text: "Budget breaker",
      color: "bg-red-100",
      borderColor: "border-red-500",
      textColor: "text-red-700",
      topText: "With this purchase: $124 at Dallas BBQ",
      subtext:
        "Food envelope only has $100 left this period. Would you like to do an envelope shuffle to find the other $24 elsewhere?",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: true,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
    {
      icon: <XCircle className="h-24 w-24 text-red-500" />,
      text: "Envelope Empty",
      color: "bg-red-100",
      borderColor: "border-red-500",
      textColor: "text-red-700",
      topText: "With this purchase: $9 at Starbucks",
      subtext:
        "Food envelope has $0 left this period. You've already reached your shuffle limit of $100 into this envelope. Would you like to alert your keepers so you can shuffle more in?",
      actionText: "",
      isDivided: true,
      dayInfo: "Day 5 of 14",
      currentSpend: "Current spend: 3 days",
      topBgColor: "bg-green-700",
      topIcon: <Check className="h-8 w-8 text-white" />,
      tooltipText: "Note: You've currently spent 3 days' worth of the money in this envelope",
      showActionButtons: true,
      statusText: "Current State",
      leftStatusText: "Super Safe",
    },
  ]

  const nextScreen = () => {
    setCurrentScreen((prev) => (prev + 1) % screens.length)
  }

  const prevScreen = () => {
    setCurrentScreen((prev) => (prev - 1 + screens.length) % screens.length)
  }

  return (
    <BudgetProvider>
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-center mb-8">Budget Enforcer</h1>

          <PeriodInfo />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <EnvelopeList />
            </div>

            <div>
              <PurchaseSimulator />
            </div>
          </div>

          <BudgetStatusScreen />
        </div>
      </main>
    </BudgetProvider>
  )
}
