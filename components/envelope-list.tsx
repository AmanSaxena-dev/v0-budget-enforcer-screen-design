"use client"

import { useBudget } from "@/context/budget-context"
import { formatCurrency, formatDaysWorth } from "@/utils/budget-calculator"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useState } from "react"
import { NewEnvelopeForm } from "@/components/new-envelope-form"
import { Progress } from "@/components/ui/progress"

export function EnvelopeList() {
  const { envelopes, setCurrentEnvelope } = useBudget()
  const [showNewEnvelopeForm, setShowNewEnvelopeForm] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Your Envelopes</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewEnvelopeForm(true)}
          className="flex items-center gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Envelope</span>
        </Button>
      </div>

      {showNewEnvelopeForm && (
        <Card>
          <CardContent className="pt-6">
            <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {envelopes.map((envelope) => {
          const dailyAmount = envelope.allocation / envelope.periodLength
          const daysWorth = envelope.spent / dailyAmount
          const percentSpent = (envelope.spent / envelope.allocation) * 100

          // Determine progress bar color based on envelope status
          let progressColor = "bg-green-500"
          if (envelope.color.includes("amber")) {
            progressColor = "bg-amber-500"
          } else if (envelope.color.includes("orange")) {
            progressColor = "bg-orange-500"
          } else if (envelope.color.includes("red")) {
            progressColor = "bg-red-500"
          }

          // Border color based on status
          let borderColor = "border-green-200"
          if (envelope.color.includes("amber")) {
            borderColor = "border-amber-200"
          } else if (envelope.color.includes("orange")) {
            borderColor = "border-orange-200"
          } else if (envelope.color.includes("red")) {
            borderColor = "border-red-200"
          }

          return (
            <Card
              key={envelope.id}
              className={`cursor-pointer hover:shadow-md transition-shadow border ${borderColor}`}
              onClick={() => setCurrentEnvelope(envelope)}
            >
              <CardContent className="p-3">
                <div className="flex items-center">
                  {/* Left side: Envelope name and total */}
                  <div className="w-1/3">
                    <h3 className="font-bold text-base">{envelope.name}</h3>
                    <div className="flex text-sm mt-1">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium ml-1">{formatCurrency(envelope.allocation)}</span>
                    </div>
                  </div>

                  {/* Right side: Progress bar and amounts */}
                  <div className="w-2/3 pl-4">
                    {/* Progress bar */}
                    <Progress value={percentSpent} indicatorColor={progressColor} className="h-2.5 mb-1" />

                    {/* Spent and remaining amounts */}
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="font-medium">{formatCurrency(envelope.spent)}</span>{" "}
                        <span className="text-gray-600">({formatDaysWorth(daysWorth)})</span>
                      </div>
                      <div>
                        <span className="font-medium">{formatCurrency(envelope.allocation - envelope.spent)}</span>{" "}
                        <span className="text-gray-600">left</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
