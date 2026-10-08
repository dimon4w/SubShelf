export type Status = 'trial' | 'active' | 'cancelled'
export type Cycle = 'weekly' | 'monthly' | 'yearly'

export interface Sub {
  id: number
  name: string
  status: Status
  /** Price charged per cycle (after the trial for trials). */
  price: number | null
  currency: string
  cycle: Cycle
  startDate: string | null
  /** trial: day of the first charge. active: any known charge date (rolled forward). cancelled: access until. */
  chargeDate: string | null
  cancelUrl: string | null
  notes: string | null
  cancelledAt: string | null
  createdAt: number
}

export const YMD = /^\d{4}-\d{2}-\d{2}$/
const DAY = 86_400_000

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function toYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isValidYmd(s: unknown): s is string {
  return typeof s === 'string' && YMD.test(s) && toYmd(parseYmd(s)) === s
}

/** The device's local calendar date. */
export function localYmd(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export function daysUntil(ymd: string, today: string): number {
  return Math.round((parseYmd(ymd).getTime() - parseYmd(today).getTime()) / DAY)
}

export function addDays(ymd: string, n: number): string {
  return toYmd(new Date(parseYmd(ymd).getTime() + n * DAY))
}

/** n-th occurrence after `base`. Clamps the day (Jan 31 + 1 month = Feb 28/29) without drifting later. */
export function addCycleN(base: string, cycle: Cycle, n: number): string {
  if (cycle === 'weekly') return addDays(base, 7 * n)
  const [y, m, d] = base.split('-').map(Number)
  const total = m - 1 + (cycle === 'monthly' ? 1 : 12) * n
  const ny = y + Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return toYmd(new Date(Date.UTC(ny, nm, Math.min(d, dim))))
}

/** Upcoming charge dates (today or later), at most `count`. Overdue trials yield nothing. */
export function upcomingCharges(s: Sub, today: string, count: number): string[] {
  if (s.status === 'cancelled' || !s.chargeDate) return []
  if (s.status === 'trial') return daysUntil(s.chargeDate, today) >= 0 ? [s.chargeDate] : []
  const out: string[] = []
  for (let n = 0; n < 5000 && out.length < count; n++) {
    const date = addCycleN(s.chargeDate, s.cycle, n)
    if (daysUntil(date, today) >= 0) out.push(date)
  }
  return out
}

export interface Next {
  date: string
  overdue: boolean
}

/** Next charge, or null when nothing will be charged. A trial past its date is reported as overdue. */
export function nextCharge(s: Sub, today: string): Next | null {
  if (s.status === 'cancelled' || !s.chargeDate) return null
  if (s.status === 'trial') {
    return { date: s.chargeDate, overdue: daysUntil(s.chargeDate, today) < 0 }
  }
  const [date] = upcomingCharges(s, today, 1)
  return date ? { date, overdue: false } : null
}

const MONTHLY: Record<Cycle, number> = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }

export function monthlyCost(s: Sub): number {
  return (s.price ?? 0) * MONTHLY[s.cycle]
}

export function fmtDate(ymd: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parseYmd(ymd))
}

export function fmtMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
