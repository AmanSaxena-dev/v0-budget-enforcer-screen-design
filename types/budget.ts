export interface Envelope {
  id: string
  name: string
  allocation: number // Total amount allocated for the period (M)
  spent: number // Amount already spent (C)
  periodLength: number // Length of period in days (L)
  startDate: Date // Start date of the period
  color: string // Status color
}

export interface Purchase {
  amount: number
  item?: string // Optional SKU/item name
  envelopeId: string
  date: Date
}

export type StatusType = "super-safe" | "safe" | "off-track" | "danger" | "envelope-empty"

export interface StatusResult {
  status: StatusType
  currentDay: number
  periodLength: number
  currentSpend: number
  expectedSpend: number
  dailyAmount: number
  remainingAmount: number
  purchase: Purchase | null
  daysWorthOfSpending: number
  daysWorthAfterPurchase: number
  envelopeName: string
  statusColor: string
  statusBorderColor: string
  statusTextColor: string
  statusText: string
  statusIcon: string
}

export interface EnvelopeStatus {
  status: StatusType
  color: string
  textColor: string
  borderColor: string
  icon: string
  text: string
}
