export interface Envelope {
  id: string
  name: string
  allocation: number
  spent: number
  periodLength: number
  startDate: Date
  color?: string
  previousRemaining?: number
}

export interface Purchase {
  id: string
  envelopeId: string
  amount: number
  date: Date
  item?: string
}

export interface ShuffleAllocation {
  envelopeId: string
  amount: number
}

export interface ShuffleTransaction {
  id: string
  targetEnvelopeId: string
  allocations: ShuffleAllocation[]
  date: Date
}

export interface ShuffleLimit {
  envelopeId: string
  maxAmount: number
  currentShuffled: number
}

export type ShuffleStrategy = "manual" | "reduce-from-all" | "recommended"

export type EnvelopeStatus = "super-safe" | "safe" | "off-track" | "danger" | "budget-breaker" | "envelope-empty"

export interface StatusResult {
  status: EnvelopeStatus
  statusText: string
  statusColor: string
  statusBorderColor: string
  statusTextColor: string
  statusIcon: string
  envelopeName: string
  currentDay: number
  periodLength: number
  daysWorthOfSpending: number
  daysWorthAfterPurchase: number
  remainingAmount: number
}
