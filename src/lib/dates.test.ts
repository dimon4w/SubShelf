import { describe, expect, it } from 'vitest'
import {
  addCycleN,
  daysUntil,
  isValidYmd,
  monthlyCost,
  nextCharge,
  upcomingCharges,
  type Sub,
} from './dates'

const sub = (over: Partial<Sub>): Sub => ({
  id: 1,
  name: 'Test',
  status: 'active',
  price: 10,
  currency: 'USD',
  cycle: 'monthly',
  startDate: null,
  chargeDate: '2026-10-01',
  cancelUrl: null,
  notes: null,
  cancelledAt: null,
  createdAt: 0,
  ...over,
})

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isValidYmd('2026-02-28')).toBe(true)
    expect(isValidYmd('2026-02-30')).toBe(false)
    expect(isValidYmd('26-2-1')).toBe(false)
  })

  it('counts days across month ends', () => {
    expect(daysUntil('2026-11-01', '2026-10-30')).toBe(2)
    expect(daysUntil('2026-10-01', '2026-10-08')).toBe(-7)
  })

  it('clamps month ends without drifting', () => {
    expect(addCycleN('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(addCycleN('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
    expect(addCycleN('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
    expect(addCycleN('2026-10-01', 'weekly', 2)).toBe('2026-10-15')
  })

  it('rolls active subscriptions forward to the next charge', () => {
    expect(nextCharge(sub({}), '2026-10-08')).toEqual({ date: '2026-11-01', overdue: false })
    expect(nextCharge(sub({}), '2026-10-01')).toEqual({ date: '2026-10-01', overdue: false })
  })

  it('reports trials as overdue once the date passed', () => {
    const t = sub({ status: 'trial', chargeDate: '2026-10-10' })
    expect(nextCharge(t, '2026-10-08')).toEqual({ date: '2026-10-10', overdue: false })
    expect(nextCharge(t, '2026-10-12')).toEqual({ date: '2026-10-10', overdue: true })
    expect(upcomingCharges(t, '2026-10-12', 2)).toEqual([])
  })

  it('never charges cancelled subscriptions', () => {
    expect(nextCharge(sub({ status: 'cancelled' }), '2026-10-08')).toBeNull()
  })

  it('lists several upcoming charges for reminders', () => {
    expect(upcomingCharges(sub({}), '2026-10-08', 2)).toEqual(['2026-11-01', '2026-12-01'])
  })

  it('normalises prices to a month', () => {
    expect(monthlyCost(sub({ cycle: 'yearly', price: 120 }))).toBe(10)
    expect(monthlyCost(sub({ price: null }))).toBe(0)
  })
})
