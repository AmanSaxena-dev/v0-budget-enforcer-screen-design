"use client"

import { useState, useMemo } from "react"
import { useBudget } from "@/context/budget-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCurrency } from "@/utils/budget-calculator"
import { ArrowLeft, ArrowRight, Check, ArrowDownRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { ShuffleAllocation, ShuffleStrategy } from "@/types/budget"

interface EnvelopeShuffleProps {
  onCancel: () => void
  onComplete: () => void
}

export function EnvelopeShuffle({ onCancel, onComplete }: EnvelopeShuffleProps) {
  const { envelopes, currentEnvelope, currentPurchase, shuffleEnvelopes } = useBudget()
  const [strategy, setStrategy] = useState<ShuffleStrategy>("manual")
  const [allocations, setAllocations] = useState<ShuffleAllocation[]>([])
  const [isConfirming, setIsConfirming] = useState(false)

  // Calculate the amount needed for the purchase
  const amountNeeded = useMemo(() => {
    if (!currentEnvelope || !currentPurchase) return 0
    const remaining = currentEnvelope.allocation - currentEnvelope.spent
    return Math.max(0, currentPurchase.amount - remaining)
  }, [currentEnvelope, currentPurchase])

  // Calculate the total amount allocated for shuffling
  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  }, [allocations])

  // Calculate the remaining amount needed
  const remainingNeeded = amountNeeded - totalAllocated

  // Get available envelopes (excluding the current one)
  const availableEnvelopes = useMemo(() => {
    if (!currentEnvelope) return []
    return envelopes.filter((env) => env.id !== currentEnvelope.id && env.allocation - env.spent > 0)
  }, [envelopes, currentEnvelope])

  // Initialize allocations when strategy changes
  const initializeAllocations = (newStrategy: ShuffleStrategy) => {
    if (!currentEnvelope || !currentPurchase || availableEnvelopes.length === 0) return

    let newAllocations: ShuffleAllocation[] = []

    switch (newStrategy) {
      case "manual":
        // Start with zero allocations for manual mode
        newAllocations = availableEnvelopes.map((env) => ({
          envelopeId: env.id,
          amount: 0,
        }))
        break

      case "reduce-from-all":
        // Calculate proportional allocations based on remaining balances
        const totalRemaining = availableEnvelopes.reduce((sum, env) => sum + (env.allocation - env.spent), 0)

        newAllocations = availableEnvelopes.map((env) => {
          const remaining = env.allocation - env.spent
          const proportion = remaining / totalRemaining
          const amount = Math.min(remaining, amountNeeded * proportion)
          return {
            envelopeId: env.id,
            amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
          }
        })
        break

      case "recommended":
        // Prioritize envelopes with the most remaining funds
        // and those with previous remaining balances
        const sortedEnvelopes = [...availableEnvelopes].sort((a, b) => {
          // First prioritize envelopes with previous remaining balances
          const aPrevRemaining = a.previousRemaining || 0
          const bPrevRemaining = b.previousRemaining || 0

          if (aPrevRemaining > 0 && bPrevRemaining === 0) return -1
          if (aPrevRemaining === 0 && bPrevRemaining > 0) return 1

          // Then prioritize by current remaining balance
          const aRemaining = a.allocation - a.spent
          const bRemaining = b.allocation - b.spent
          return bRemaining - aRemaining
        })

        // Allocate from envelopes in order until we've covered the amount needed
        let remainingToAllocate = amountNeeded
        newAllocations = []

        for (const env of sortedEnvelopes) {
          if (remainingToAllocate <= 0) break

          const available = env.allocation - env.spent
          const toTake = Math.min(available, remainingToAllocate)

          if (toTake > 0) {
            newAllocations.push({
              envelopeId: env.id,
              amount: Math.round(toTake * 100) / 100, // Round to 2 decimal places
            })
            remainingToAllocate -= toTake
          }
        }
        break
    }

    setAllocations(newAllocations)
  }

  // Update allocation for a specific envelope
  const updateAllocation = (envelopeId: string, amount: number) => {
    const newAllocations = allocations.map((allocation) => {
      if (allocation.envelopeId === envelopeId) {
        return { ...allocation, amount }
      }
      return allocation
    })
    setAllocations(newAllocations)
  }

  // Handle strategy change
  const handleStrategyChange = (newStrategy: ShuffleStrategy) => {
    setStrategy(newStrategy)
    initializeAllocations(newStrategy)
  }

  // Handle confirm button click
  const handleConfirm = () => {
    if (totalAllocated < amountNeeded) {
      alert(`You still need to allocate ${formatCurrency(remainingNeeded)} more.`)
      return
    }

    setIsConfirming(true)
  }

  // Handle final confirmation
  const handleFinalConfirm = () => {
    if (!currentEnvelope || !currentPurchase) return

    shuffleEnvelopes(currentEnvelope.id, currentPurchase, allocations)
    onComplete()
  }

  // Initialize allocations on first render
  useMemo(() => {
    initializeAllocations(strategy)
  }, [amountNeeded, availableEnvelopes])

  if (!currentEnvelope || !currentPurchase) {
    return null
  }

  // If we're confirming, show the confirmation screen
  if (isConfirming) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Confirm Envelope Shuffle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>
            You are about to move {formatCurrency(totalAllocated)} from other envelopes to your{" "}
            <strong>{currentEnvelope.name}</strong> envelope to cover your purchase of{" "}
            {formatCurrency(currentPurchase.amount)}
            {currentPurchase.item ? ` for ${currentPurchase.item}` : ""}.
          </p>

          <div className="space-y-4">
            <h3 className="font-semibold">Impact on source envelopes:</h3>

            {allocations
              .filter((allocation) => allocation.amount > 0)
              .map((allocation) => {
                const envelope = envelopes.find((env) => env.id === allocation.envelopeId)
                if (!envelope) return null

                const currentRemaining = envelope.allocation - envelope.spent
                const newRemaining = currentRemaining - allocation.amount
                const currentPercentUsed = (envelope.spent / envelope.allocation) * 100
                const newPercentUsed = ((envelope.spent + allocation.amount) / envelope.allocation) * 100

                return (
                  <div key={allocation.envelopeId} className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">{envelope.name}</h4>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(allocation.amount)}</span>
                        <span className="text-muted-foreground"> will be taken</span>
                      </div>
                    </div>

                    {/* Before shuffle */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Current</span>
                        <span>{formatCurrency(currentRemaining)} remaining</span>
                      </div>
                      <Progress value={currentPercentUsed} className="h-2 mb-1" />
                      <div className="flex justify-between text-xs">
                        <span>{formatCurrency(envelope.spent)} spent</span>
                        <span>{formatCurrency(envelope.allocation)} total</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center my-2">
                      <ArrowDownRight className="text-muted-foreground h-5 w-5" />
                    </div>

                    {/* After shuffle */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>After shuffle</span>
                        <span>{formatCurrency(newRemaining)} remaining</span>
                      </div>
                      <Progress value={newPercentUsed} className="h-2 mb-1" indicatorColor="bg-amber-500" />
                      <div className="flex justify-between text-xs">
                        <span>{formatCurrency(envelope.spent)} spent</span>
                        <span>{formatCurrency(envelope.allocation - allocation.amount)} total</span>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Target envelope impact */}
          <div className="border rounded-md p-4 bg-gray-50">
            <h3 className="font-semibold mb-3">Impact on target envelope:</h3>

            <div>
              <h4 className="font-medium mb-2">{currentEnvelope.name}</h4>

              {/* Before shuffle */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>Current</span>
                  <span>{formatCurrency(currentEnvelope.allocation - currentEnvelope.spent)} remaining</span>
                </div>
                <Progress value={(currentEnvelope.spent / currentEnvelope.allocation) * 100} className="h-2 mb-1" />
                <div className="flex justify-between text-xs">
                  <span>{formatCurrency(currentEnvelope.spent)} spent</span>
                  <span>{formatCurrency(currentEnvelope.allocation)} total</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-2">
                <ArrowDownRight className="text-muted-foreground h-5 w-5" />
              </div>

              {/* After shuffle and purchase */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>After shuffle & purchase</span>
                  <span>
                    {formatCurrency(
                      currentEnvelope.allocation + amountNeeded - currentEnvelope.spent - currentPurchase.amount,
                    )}{" "}
                    remaining
                  </span>
                </div>
                <Progress
                  value={
                    ((currentEnvelope.spent + currentPurchase.amount) / (currentEnvelope.allocation + amountNeeded)) *
                    100
                  }
                  className="h-2 mb-1"
                  indicatorColor="bg-green-500"
                />
                <div className="flex justify-between text-xs">
                  <span>{formatCurrency(currentEnvelope.spent + currentPurchase.amount)} spent</span>
                  <span>{formatCurrency(currentEnvelope.allocation + amountNeeded)} total</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsConfirming(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleFinalConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Confirm Shuffle
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Envelope Shuffle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2">
            You need {formatCurrency(amountNeeded)} more to cover your purchase of{" "}
            {formatCurrency(currentPurchase.amount)}
            {currentPurchase.item ? ` for ${currentPurchase.item}` : ""}.
          </p>
          <p className="text-sm text-muted-foreground">Choose how you want to shuffle money from other envelopes.</p>
        </div>

        <RadioGroup value={strategy} onValueChange={(value) => handleStrategyChange(value as ShuffleStrategy)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="manual" id="manual" />
            <Label htmlFor="manual">Manual Selection</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="reduce-from-all" id="reduce-from-all" />
            <Label htmlFor="reduce-from-all">Reduce From All</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="recommended" id="recommended" />
            <Label htmlFor="recommended">Recommended</Label>
          </div>
        </RadioGroup>

        <div className="space-y-4">
          <div className="flex justify-between">
            <h3 className="font-semibold">Available Envelopes</h3>
            <div className="text-sm">
              <span className="font-medium">
                {formatCurrency(totalAllocated)} / {formatCurrency(amountNeeded)}
              </span>{" "}
              allocated
            </div>
          </div>

          {availableEnvelopes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No envelopes available for shuffling.</p>
          ) : (
            <div className="space-y-3">
              {availableEnvelopes.map((envelope) => {
                const allocation = allocations.find((a) => a.envelopeId === envelope.id)
                const remaining = envelope.allocation - envelope.spent
                const maxAmount = Math.min(remaining, amountNeeded)
                const percentUsed = (envelope.spent / envelope.allocation) * 100
                const allocationAmount = allocation?.amount || 0
                const newPercentUsed = ((envelope.spent + allocationAmount) / envelope.allocation) * 100

                return (
                  <div key={envelope.id} className="border rounded-md p-3">
                    <div className="flex justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{envelope.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatCurrency(remaining)} available</p>
                      </div>
                      {strategy === "manual" && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`amount-${envelope.id}`} className="sr-only">
                            Amount
                          </Label>
                          <Input
                            id={`amount-${envelope.id}`}
                            type="number"
                            min="0"
                            max={maxAmount}
                            step="0.01"
                            value={allocation?.amount || 0}
                            onChange={(e) => {
                              const value = Number.parseFloat(e.target.value)
                              if (!isNaN(value) && value >= 0 && value <= maxAmount) {
                                updateAllocation(envelope.id, value)
                              }
                            }}
                            className="w-24"
                          />
                        </div>
                      )}
                      {strategy !== "manual" && allocation && (
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(allocation.amount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar showing impact */}
                    {allocation && allocation.amount > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Current usage</span>
                          <span>{Math.round(percentUsed)}%</span>
                        </div>
                        <Progress value={percentUsed} className="h-1.5 mb-1" />

                        <div className="flex justify-between text-xs mb-1">
                          <span>After shuffle</span>
                          <span>{Math.round(newPercentUsed)}%</span>
                        </div>
                        <Progress
                          value={newPercentUsed}
                          className="h-1.5"
                          indicatorColor={newPercentUsed > 80 ? "bg-amber-500" : "bg-primary"}
                        />
                      </div>
                    )}

                    {envelope.previousRemaining && envelope.previousRemaining > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Had {formatCurrency(envelope.previousRemaining)} remaining last period
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={totalAllocated < amountNeeded || availableEnvelopes.length === 0}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
