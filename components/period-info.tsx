"use client"

import { useBudget } from "@/context/budget-context"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { calculateDayInPeriod } from "@/utils/budget-calculator"
import { Calendar } from "lucide-react"

export function PeriodInfo() {
  const { currentPeriod } = useBudget()

  if (!currentPeriod) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center">
            <div className="flex items-center mb-2 sm:mb-0">
              <div className="bg-primary/10 p-3 rounded-full mr-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">No Active Period</h2>
                <p className="text-sm text-gray-600">Please set up your budget</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Use the actual stored period dates
  const startDate = currentPeriod.startDate
  const endDate = currentPeriod.endDate

  // Calculate period length from actual dates
  const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate current day in period with proper bounds
  const currentDay = calculateDayInPeriod(startDate, periodLength)

  // Format dates
  const formattedStartDate = format(startDate, "MMMM d, yyyy")
  const formattedEndDate = format(endDate, "MMMM d, yyyy")

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <div className="bg-primary/10 p-3 rounded-full mr-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold">Current Period</h2>
              <p className="text-sm text-gray-600">
                {formattedStartDate} to {formattedEndDate}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center bg-gray-100 px-6 py-3 rounded-lg">
            <h2 className="text-2xl font-bold text-primary">Day {currentDay}</h2>
            <p className="text-sm text-gray-600">of {periodLength}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
