"use client"

import { useState, useEffect } from "react"
import { useBudget } from "@/context/budget-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/utils/budget-calculator"
import { PlusCircle, Scan } from "lucide-react"
import { NewEnvelopeForm } from "@/components/new-envelope-form"

export function PurchaseSimulator() {
  const {
    envelopes,
    currentEnvelope,
    setCurrentEnvelope,
    simulatePurchase,
    resetSimulation,
    currentPurchase,
    showStatusScreen,
  } = useBudget()

  const [amount, setAmount] = useState("")
  const [item, setItem] = useState("")
  const [showNewEnvelopeForm, setShowNewEnvelopeForm] = useState(false)

  // Set the first envelope as current when component mounts if none is selected
  useEffect(() => {
    if (envelopes.length > 0 && !currentEnvelope) {
      setCurrentEnvelope(envelopes[0])
    }
  }, [envelopes, currentEnvelope, setCurrentEnvelope])

  const handleSimulate = () => {
    if (currentEnvelope && amount) {
      simulatePurchase({
        amount: Number.parseFloat(amount),
        item: item || undefined,
        envelopeId: currentEnvelope.id,
        date: new Date(),
      })
    }
  }

  const handleScanBarcode = () => {
    // In a real app, this would integrate with a barcode scanner
    alert("Barcode scanning would be implemented here")
  }

  if (showStatusScreen) {
    return null // Hide the simulator when showing status screen
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What do you want to buy?</CardTitle>
      </CardHeader>
      <CardContent>
        {showNewEnvelopeForm ? (
          <NewEnvelopeForm onComplete={() => setShowNewEnvelopeForm(false)} />
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="envelope">Envelope *</Label>
              <div className="flex gap-2">
                <Select
                  value={currentEnvelope?.id || ""}
                  onValueChange={(value) => {
                    if (value === "new") {
                      setShowNewEnvelopeForm(true)
                    } else {
                      const envelope = envelopes.find((env) => env.id === value)
                      if (envelope) {
                        setCurrentEnvelope(envelope)
                        resetSimulation()
                      }
                    }
                  }}
                >
                  <SelectTrigger id="envelope" className="flex-1">
                    <SelectValue placeholder="Select an envelope" />
                  </SelectTrigger>
                  <SelectContent>
                    {envelopes.map((envelope) => (
                      <SelectItem key={envelope.id} value={envelope.id}>
                        {envelope.name} ({formatCurrency(envelope.allocation - envelope.spent)} remaining)
                      </SelectItem>
                    ))}
                    <SelectItem value="new" className="text-primary">
                      <div className="flex items-center gap-1">
                        <PlusCircle className="h-4 w-4" />
                        <span>New Envelope</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                required
                disabled={!!currentPurchase}
              />
            </div>

            <div>
              <Label htmlFor="item" className="flex items-center gap-1">
                <span>Item/SKU</span>
                <span className="text-xs text-gray-500">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="item"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Enter item name or SKU"
                  disabled={!!currentPurchase}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleScanBarcode} disabled={!!currentPurchase}>
                  <Scan className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSimulate}
              disabled={!amount || !currentEnvelope || !!currentPurchase}
              className="w-full"
            >
              Check Purchase Impact
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PurchaseSimulator
