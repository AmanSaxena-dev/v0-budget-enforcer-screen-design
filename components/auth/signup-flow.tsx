"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatCurrency } from "@/utils/budget-calculator"

interface SignupFlowProps {
  onComplete: (preferences: {
    periodLength: number
    firstPeriodStart: Date
    firstPeriodLength: number
    nextPayday: Date
    paycheckAmount: number
    paycheckFrequency: string
    monthlyPayDay?: number
    semiMonthlyPayDays?: [number, number]
  }) => void
}

export function SignupFlow({ onComplete }: SignupFlowProps) {
  const [step, setStep] = useState(1)
  const [paycheckFrequency, setPaycheckFrequency] = useState<string>("")
  const [nextPayday, setNextPayday] = useState<Date | undefined>(undefined)
  const [paycheckAmount, setPaycheckAmount] = useState("")
  const [semiMonthlyPayDays, setSemiMonthlyPayDays] = useState<[number, number]>([1, 15])

  const today = new Date()

  // Calculate period setup based on paycheck info
  const calculatePeriodSetup = () => {
    if (!nextPayday || !paycheckFrequency) return null

    const daysUntilPayday = differenceInDays(nextPayday, today)
    let periodLength = 14 // default

    switch (paycheckFrequency) {
      case "weekly":
        periodLength = 7
        break
      case "biweekly":
        periodLength = 14
        break
      case "monthly":
        // For monthly, calculate days between this paycheck and next
        const nextMonth = new Date(nextPayday)
        nextMonth.setMonth(nextPayday.getMonth() + 1)
        periodLength = Math.ceil((nextMonth.getTime() - nextPayday.getTime()) / (1000 * 60 * 60 * 24))
        break
      case "semimonthly":
        // For semi-monthly, periods will be from one pay date to the next
        const [firstPayDay, secondPayDay] = semiMonthlyPayDays.sort((a, b) => a - b)
        const currentPayDay = nextPayday.getDate()

        if (currentPayDay === firstPayDay) {
          // Next pay is the second pay day of the same month
          periodLength = secondPayDay - firstPayDay
        } else {
          // Next pay is the first pay day of the next month
          const daysInMonth = new Date(nextPayday.getFullYear(), nextPayday.getMonth() + 1, 0).getDate()
          periodLength = daysInMonth - currentPayDay + firstPayDay
        }
        break
    }

    const firstPeriodStart = today
    // The sync period should end the day BEFORE the next paycheck
    const firstPeriodLength = daysUntilPayday > 0 ? daysUntilPayday : 1

    // Calculate first period end (day before next paycheck)
    const firstPeriodEnd = new Date(nextPayday)
    firstPeriodEnd.setDate(nextPayday.getDate() - 1)

    // Ensure end date is set to end of day
    firstPeriodEnd.setHours(23, 59, 59, 999)

    // Calculate second period (first full period) - starts on paycheck day
    const secondPeriodStart = new Date(nextPayday)
    const secondPeriodEnd = new Date(secondPeriodStart)

    if (paycheckFrequency === "monthly") {
      // For monthly, end on the day before next month's pay day
      secondPeriodEnd.setMonth(secondPeriodStart.getMonth() + 1)
      secondPeriodEnd.setDate(secondPeriodStart.getDate() - 1)
    } else if (paycheckFrequency === "semimonthly") {
      // For semi-monthly, end on the day before the next pay date
      const currentPayDay = secondPeriodStart.getDate()
      const [firstPayDay, secondPayDay] = semiMonthlyPayDays.sort((a, b) => a - b)

      if (currentPayDay === firstPayDay) {
        // Next pay is the second pay day of the same month
        secondPeriodEnd.setDate(secondPayDay - 1)
      } else {
        // Next pay is the first pay day of the next month
        secondPeriodEnd.setMonth(secondPeriodStart.getMonth() + 1)
        secondPeriodEnd.setDate(firstPayDay - 1)
      }
    } else {
      // For weekly/biweekly, add the period length and subtract 1 day
      secondPeriodEnd.setDate(secondPeriodStart.getDate() + periodLength - 1)
    }

    // Ensure end date is set to end of day
    secondPeriodEnd.setHours(23, 59, 59, 999)

    console.log("Calculated period setup:", {
      firstPeriodStart: format(firstPeriodStart, "MMM d, yyyy"),
      firstPeriodEnd: format(firstPeriodEnd, "MMM d, yyyy"),
      firstPeriodLength,
      secondPeriodStart: format(secondPeriodStart, "MMM d, yyyy"),
      secondPeriodEnd: format(secondPeriodEnd, "MMM d, yyyy"),
      periodLength,
    })

    return {
      firstPeriodStart,
      firstPeriodLength,
      firstPeriodEnd,
      secondPeriodStart,
      secondPeriodEnd,
      periodLength,
    }
  }

  const handleNext = () => {
    if (step === 1 && paycheckFrequency) {
      setStep(2)
    } else if (step === 2 && nextPayday && paycheckAmount) {
      if (paycheckFrequency === "semimonthly") {
        setStep(3)
      } else {
        setStep(4)
      }
    } else if (step === 3) {
      setStep(4)
    }
  }

  const handleComplete = () => {
    if (nextPayday && paycheckFrequency && paycheckAmount) {
      const setup = calculatePeriodSetup()
      if (setup) {
        onComplete({
          periodLength: setup.periodLength,
          firstPeriodStart: setup.firstPeriodStart,
          firstPeriodLength: setup.firstPeriodLength,
          nextPayday,
          paycheckAmount: Number.parseFloat(paycheckAmount),
          paycheckFrequency,
          monthlyPayDay: paycheckFrequency === "monthly" ? nextPayday.getDate() : undefined,
          semiMonthlyPayDays: paycheckFrequency === "semimonthly" ? semiMonthlyPayDays : undefined,
        })
      }
    }
  }

  const setup = calculatePeriodSetup()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Paycheck Setup</CardTitle>
      </CardHeader>
      <CardContent>
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium">How often do you get paid?</h3>
            <RadioGroup value={paycheckFrequency} onValueChange={setPaycheckFrequency}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="biweekly" id="biweekly" />
                <Label htmlFor="biweekly">Every 2 weeks</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="semimonthly" id="semimonthly" />
                <Label htmlFor="semimonthly">Twice a month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly">Monthly</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium">Paycheck Details</h3>

            <div className="space-y-2">
              <Label htmlFor="next-payday">When is your next payday?</Label>
              <Input
                id="next-payday"
                type="date"
                value={nextPayday ? format(nextPayday, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    // Create date in local timezone to avoid day-off issues
                    const [year, month, day] = e.target.value.split("-").map(Number)
                    const selectedDate = new Date(year, month - 1, day)
                    setNextPayday(selectedDate)

                    // Auto-set one of the semi-monthly pay days if semi-monthly is selected
                    if (paycheckFrequency === "semimonthly") {
                      setSemiMonthlyPayDays([day, semiMonthlyPayDays[1]])
                    }
                  }
                }}
                min={format(today, "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paycheck-amount">How much is your paycheck? (after taxes)</Label>
              <Input
                id="paycheck-amount"
                type="number"
                value={paycheckAmount}
                onChange={(e) => setPaycheckAmount(e.target.value)}
                placeholder="e.g., 2500"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {step === 3 && paycheckFrequency === "semimonthly" && (
          <div className="space-y-4">
            <h3 className="font-medium">Semi-Monthly Pay Schedule</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="first-pay-day">First payday of the month</Label>
                <Input
                  id="first-pay-day"
                  type="number"
                  value={semiMonthlyPayDays[0]}
                  onChange={(e) => setSemiMonthlyPayDays([Number.parseInt(e.target.value), semiMonthlyPayDays[1]])}
                  min="1"
                  max="31"
                  placeholder="e.g., 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="second-pay-day">Second payday of the month</Label>
                <Input
                  id="second-pay-day"
                  type="number"
                  value={semiMonthlyPayDays[1]}
                  onChange={(e) => setSemiMonthlyPayDays([semiMonthlyPayDays[0], Number.parseInt(e.target.value)])}
                  min="1"
                  max="31"
                  placeholder="e.g., 15"
                />
              </div>
              <p className="text-xs text-muted-foreground">Your budget periods will start on these days each month.</p>
            </div>
          </div>
        )}

        {step === 4 && setup && (
          <div className="space-y-4">
            <h3 className="font-medium">Your Budget Schedule</h3>
            <Alert>
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Sync Period (Starting Today)</p>
                    <p className="text-sm">
                      {format(setup.firstPeriodStart, "MMM d")} - {format(setup.firstPeriodEnd, "MMM d, yyyy")} (
                      {setup.firstPeriodLength} days)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This period will sync your budget with your paycheck schedule.
                    </p>
                  </div>

                  <div>
                    <p className="font-medium">First Full Period</p>
                    <p className="text-sm">
                      {format(setup.secondPeriodStart, "MMM d")} - {format(setup.secondPeriodEnd, "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paycheckFrequency === "monthly"
                        ? `Your monthly budget periods will start on the ${format(nextPayday!, "do")} of each month.`
                        : paycheckFrequency === "semimonthly"
                          ? `Your budget periods will start on the ${semiMonthlyPayDays[0]}${getOrdinalSuffix(semiMonthlyPayDays[0])} and ${semiMonthlyPayDays[1]}${getOrdinalSuffix(semiMonthlyPayDays[1])} of each month.`
                          : `Your regular ${setup.periodLength}-day budget periods will start here.`}
                    </p>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-sm">
                      <strong>Paycheck:</strong> {formatCurrency(Number.parseFloat(paycheckAmount || "0"))} every{" "}
                      {paycheckFrequency === "biweekly"
                        ? "2 weeks"
                        : paycheckFrequency === "semimonthly"
                          ? "2 weeks"
                          : paycheckFrequency}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {step > 1 && (
          <Button onClick={() => setStep(step - 1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        {step < 4 && (
          <Button
            onClick={handleNext}
            disabled={
              (step === 1 && !paycheckFrequency) ||
              (step === 2 && (!nextPayday || !paycheckAmount)) ||
              (step === 3 &&
                paycheckFrequency === "semimonthly" &&
                (!semiMonthlyPayDays[0] || !semiMonthlyPayDays[1] || semiMonthlyPayDays[0] === semiMonthlyPayDays[1]))
            }
            className="ml-auto"
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {step === 4 && (
          <Button onClick={handleComplete} className="ml-auto">
            Continue to Budget Setup
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return "st"
  }
  if (j === 2 && k !== 12) {
    return "nd"
  }
  if (j === 3 && k !== 13) {
    return "rd"
  }
  return "th"
}
