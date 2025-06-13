"use client"

import { useState } from "react"
import { useBudget } from "@/context/budget-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/utils/budget-calculator"
import { Progress } from "@/components/ui/progress"
import { Edit2, Save } from "lucide-react"

export function ShuffleLimits() {
  const { envelopes, shuffleLimits, updateShuffleLimit } = useBudget()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>("")

  const handleEdit = (envelopeId: string, currentLimit: number) => {
    setEditingId(envelopeId)
    setEditValue(currentLimit.toString())
  }

  const handleSave = (envelopeId: string) => {
    const value = Number.parseFloat(editValue)
    if (!isNaN(value) && value >= 0) {
      updateShuffleLimit(envelopeId, value)
    }
    setEditingId(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envelope Shuffle Limits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {envelopes.map((envelope) => {
            const limit = shuffleLimits.find((l) => l.envelopeId === envelope.id)
            const maxAmount = limit?.maxAmount || 0
            const currentShuffled = limit?.currentShuffled || 0
            const percentUsed = maxAmount > 0 ? (currentShuffled / maxAmount) * 100 : 0

            return (
              <div key={envelope.id} className="border rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">{envelope.name}</h3>

                  {editingId === envelope.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-24 h-8"
                        min="0"
                        step="0.01"
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSave(envelope.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>{formatCurrency(maxAmount)}</span>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(envelope.id, maxAmount)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Used: {formatCurrency(currentShuffled)}</span>
                    <span>Remaining: {formatCurrency(maxAmount - currentShuffled)}</span>
                  </div>
                  <Progress value={percentUsed} className="h-2" />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
