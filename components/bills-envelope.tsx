"use client"

import { useState } from "react"
import { useBudget } from "@/context/budget-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/utils/budget-calculator"
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle, DollarSign } from "lucide-react"
import { format, isBefore } from "date-fns"
import type { Bill } from "@/types/budget"

export function BillsEnvelope() {
  const { billsEnvelope, addBill, updateBill, deleteBill, addMoneyToBills } = useBudget()
  const [showAddBill, setShowAddBill] = useState(false)
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [newBill, setNewBill] = useState<Omit<Bill, "id">>({
    name: "",
    amount: 0,
    dueDay: 1,
    isRecurring: true,
    category: "",
  })
  const [addMoneyAmount, setAddMoneyAmount] = useState("")

  if (!billsEnvelope) {
    return null
  }

  const handleAddBill = () => {
    if (newBill.name && newBill.amount > 0) {
      addBill(newBill)
      setNewBill({
        name: "",
        amount: 0,
        dueDay: 1,
        isRecurring: true,
        category: "",
      })
      setShowAddBill(false)
    }
  }

  const handleAddMoney = () => {
    const amount = Number.parseFloat(addMoneyAmount)
    if (amount > 0) {
      addMoneyToBills(amount)
      setAddMoneyAmount("")
      setShowAddMoney(false)
    }
  }

  // Calculate funding status
  const fundingPercentage =
    billsEnvelope.totalMonthlyBills > 0 ? (billsEnvelope.currentBalance / billsEnvelope.totalMonthlyBills) * 100 : 100

  const cushionPercentage =
    billsEnvelope.targetAmount > 0 ? (billsEnvelope.currentBalance / billsEnvelope.targetAmount) * 100 : 100

  // Get next few bills due
  const today = new Date()
  const upcomingBills = billsEnvelope.bills
    .map((bill) => {
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), bill.dueDay)
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, bill.dueDay)

      // If this month's due date has passed, use next month
      const dueDate = isBefore(thisMonth, today) ? nextMonth : thisMonth

      return {
        ...bill,
        dueDate,
      }
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 3)

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Bills Envelope</h3>
              <p className="text-sm text-muted-foreground">Mandatory monthly expenses</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatCurrency(billsEnvelope.currentBalance)}</div>
            <div className="text-sm text-muted-foreground">of {formatCurrency(billsEnvelope.targetAmount)} target</div>
            <div className="text-xs text-muted-foreground">
              ({formatCurrency(billsEnvelope.totalMonthlyBills)} bills + {formatCurrency(billsEnvelope.cushionAmount)}{" "}
              cushion)
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funding Status */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Monthly Funding Status</span>
            <Badge
              variant={
                billsEnvelope.hasReachedCushion ? "default" : billsEnvelope.isFullyFunded ? "secondary" : "destructive"
              }
            >
              {billsEnvelope.hasReachedCushion ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" /> Cushioned
                </>
              ) : billsEnvelope.isFullyFunded ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" /> Bills Covered
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" /> Underfunded
                </>
              )}
            </Badge>
          </div>

          {/* Bills funding progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Bills Coverage</span>
              <span>{fundingPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  fundingPercentage >= 100 ? "bg-green-500" : fundingPercentage >= 75 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(fundingPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Cushion progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Cushion Target ({formatCurrency(billsEnvelope.cushionAmount)} buffer)</span>
              <span>{cushionPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  cushionPercentage >= 100 ? "bg-blue-500" : "bg-gray-400"
                }`}
                style={{ width: `${Math.min(cushionPercentage, 100)}%` }}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {billsEnvelope.hasReachedCushion ? (
              <>✓ Cushioned • Maintenance: {formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck</>
            ) : (
              <>Need {formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to reach cushion target</>
            )}
          </div>
        </div>

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Upcoming Bills</h4>
            <div className="space-y-2">
              {upcomingBills.map((bill) => (
                <div key={bill.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">Due {format(bill.dueDate, "MMM d")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(bill.amount)}</p>
                    {bill.category && <p className="text-xs text-muted-foreground capitalize">{bill.category}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Bills List */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">All Bills ({billsEnvelope.bills.length})</h4>
            <Button variant="outline" size="sm" onClick={() => setShowAddBill(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Bill
            </Button>
          </div>

          {showAddBill && (
            <Card className="p-4 border-dashed">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="bill-name">Bill Name</Label>
                    <Input
                      id="bill-name"
                      value={newBill.name}
                      onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                      placeholder="e.g., Rent, Electric"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bill-amount">Amount</Label>
                    <Input
                      id="bill-amount"
                      type="number"
                      value={newBill.amount}
                      onChange={(e) => setNewBill({ ...newBill, amount: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="bill-due-day">Due Day of Month</Label>
                    <Input
                      id="bill-due-day"
                      type="number"
                      value={newBill.dueDay}
                      onChange={(e) => setNewBill({ ...newBill, dueDay: Number.parseInt(e.target.value) || 1 })}
                      min="1"
                      max="31"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bill-category">Category (optional)</Label>
                    <Input
                      id="bill-category"
                      value={newBill.category}
                      onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                      placeholder="e.g., utilities, rent"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddBill(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBill}>Add Bill</Button>
                </div>
              </div>
            </Card>
          )}

          <div className="space-y-1">
            {billsEnvelope.bills.map((bill) => (
              <div key={bill.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <p className="font-medium text-sm">{bill.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {bill.dueDay}
                    {getDayOrdinal(bill.dueDay)} of each month
                    {bill.category && ` • ${bill.category}`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{formatCurrency(bill.amount)}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteBill(bill.id)} className="h-6 w-6">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Money Section */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">Add Money to Bills</h4>
            <Button variant="outline" size="sm" onClick={() => setShowAddMoney(true)}>
              <DollarSign className="h-4 w-4 mr-1" />
              Add Money
            </Button>
          </div>

          {showAddMoney && (
            <div className="space-y-3 p-3 bg-gray-50 rounded">
              <div>
                <Label htmlFor="add-money-amount">Amount to Add</Label>
                <Input
                  id="add-money-amount"
                  type="number"
                  value={addMoneyAmount}
                  onChange={(e) => setAddMoneyAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddMoney(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMoney}>Add Money</Button>
              </div>
            </div>
          )}

          {!billsEnvelope.hasReachedCushion && billsEnvelope.requiredPerPaycheck > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {billsEnvelope.isFullyFunded
                  ? `Add ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to build cushion`
                  : `Add ${formatCurrency(billsEnvelope.requiredPerPaycheck)} per paycheck to cover bills + cushion`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getDayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) {
    return "th"
  }
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}
