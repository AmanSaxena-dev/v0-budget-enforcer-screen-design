"use client"

import { useBudget } from "@/context/budget-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/utils/budget-calculator"
import { format } from "date-fns"
import { ArrowRightLeft, ShoppingBag } from "lucide-react"

export function TransactionHistory() {
  const { purchases, shuffleTransactions, envelopes } = useBudget()

  // Sort transactions by date (newest first)
  const sortedPurchases = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const sortedShuffles = [...shuffleTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  // Get envelope name by ID
  const getEnvelopeName = (id: string) => {
    const envelope = envelopes.find((env) => env.id === id)
    return envelope ? envelope.name : "Unknown"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="shuffles">Envelope Shuffles</TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="mt-4">
            {sortedPurchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No purchases yet</p>
            ) : (
              <div className="space-y-4">
                {sortedPurchases.map((purchase) => (
                  <div key={purchase.id} className="flex items-start border-b pb-3">
                    <div className="bg-primary/10 p-2 rounded-full mr-3">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{purchase.item || "Purchase"}</p>
                          <p className="text-xs text-muted-foreground">{getEnvelopeName(purchase.envelopeId)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(purchase.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(purchase.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shuffles" className="mt-4">
            {sortedShuffles.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No envelope shuffles yet</p>
            ) : (
              <div className="space-y-4">
                {sortedShuffles.map((shuffle) => {
                  const targetEnvelope = getEnvelopeName(shuffle.targetEnvelopeId)
                  const totalAmount = shuffle.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)

                  return (
                    <div key={shuffle.id} className="border rounded-md p-3">
                      <div className="flex items-start mb-2">
                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                          <ArrowRightLeft className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <p className="font-medium">Envelope Shuffle</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(shuffle.date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <p className="text-sm">
                            Moved {formatCurrency(totalAmount)} to {targetEnvelope}
                          </p>
                        </div>
                      </div>

                      <div className="pl-9 space-y-1">
                        <p className="text-xs font-medium">Sources:</p>
                        {shuffle.allocations.map((alloc, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span>{getEnvelopeName(alloc.envelopeId)}</span>
                            <span>{formatCurrency(alloc.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
