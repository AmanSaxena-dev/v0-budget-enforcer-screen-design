"use client"

import { useBudget } from "@/context/budgetContext"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { calculateDayInPeriod } from "@/utils/budget-calculator"

export function PeriodInfo() {
  const { envelopes } = useBudget()

  // Use the first envelope to get period info, or default to current date
  const startDate = envelopes.length > 0 ? envelopes[0].startDate : new Date()
  const periodLength = envelopes.length > 0 ? envelopes[0].periodLength : 14

  // Calculate end date
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + periodLength - 1)

  // Calculate current day in period
  const currentDay = calculateDayInPeriod(startDate)

  // Format dates
  const formattedStartDate = format(startDate, "MMMM d, yyyy")
  const formattedEndDate = format(endDate, "MMMM d, yyyy")
  const formattedCurrentDate = format(new Date(), "MMMM d, yyyy")

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <div>
            <h2 className="font-bold">Current Period</h2>
            <p className="text-sm text-gray-600">
              {formattedStartDate} to {formattedEndDate}
            </p>
          </div>
          <div className="mt-2 sm:mt-0">
            <h2 className="font-bold">Today</h2>
            <p className="text-sm text-gray-600">
              {formattedCurrentDate} <span className="font-medium">(Day {currentDay})</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
