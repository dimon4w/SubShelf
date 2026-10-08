import { Preferences } from '@capacitor/preferences'
import { isValidYmd, type Cycle, type Status, type Sub } from './dates'

const SUBS_KEY = 'subshelf.subs.v1'
const SETTINGS_KEY = 'subshelf.settings.v1'

export type ThemePref = 'system' | 'light' | 'dark'
export type LangPref = 'system' | 'ru' | 'en'

export interface Settings {
  theme: ThemePref
  lang: LangPref
  /** Liquid-glass refraction (SVG displacement). Off = blur only, cheaper on weak phones. */
  refraction: boolean
  /** Local hour for reminder notifications. */
  remindHour: number
}

export const defaultSettings: Settings = {
  theme: 'system',
  lang: 'system',
  refraction: true,
  remindHour: 10,
}

const STATUSES: Status[] = ['trial', 'active', 'cancelled']
const CYCLES: Cycle[] = ['weekly', 'monthly', 'yearly']

export function normalizeUrl(raw: unknown): string | null {
  let u = typeof raw === 'string' ? raw.trim() : ''
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(u) && u.length <= 500 ? u : null
}

/** Coerce anything (storage, backups, form) into a valid Sub, or null when it can't be. */
export function sanitizeSub(raw: unknown, fallbackId: number): Sub | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : ''
  if (!name) return null
  const price = r.price === null || r.price === undefined || r.price === '' ? null : Number(r.price)
  const currency = typeof r.currency === 'string' ? r.currency.trim().toUpperCase() : ''
  const date = (v: unknown) => (isValidYmd(v) ? v : null)
  return {
    id: Number.isInteger(r.id) && (r.id as number) > 0 ? (r.id as number) : fallbackId,
    name,
    status: STATUSES.includes(r.status as Status) ? (r.status as Status) : 'trial',
    price: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    cycle: CYCLES.includes(r.cycle as Cycle) ? (r.cycle as Cycle) : 'monthly',
    startDate: date(r.startDate),
    chargeDate: date(r.chargeDate),
    cancelUrl: normalizeUrl(r.cancelUrl),
    notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim().slice(0, 500) : null,
    cancelledAt: date(r.cancelledAt),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  }
}

export function sanitizeList(raw: unknown): Sub[] {
  if (!Array.isArray(raw)) return []
  const out: Sub[] = []
  const seen = new Set<number>()
  let next = 1
  for (const item of raw) {
    while (seen.has(next)) next++
    const s = sanitizeSub(item, next)
    if (!s) continue
    if (seen.has(s.id)) s.id = Math.max(...seen) + 1
    seen.add(s.id)
    out.push(s)
  }
  return out
}

export function nextId(subs: Sub[]): number {
  return subs.reduce((max, s) => Math.max(max, s.id), 0) + 1
}

export async function loadSubs(): Promise<Sub[]> {
  const { value } = await Preferences.get({ key: SUBS_KEY })
  if (!value) return []
  try {
    return sanitizeList(JSON.parse(value))
  } catch (err) {
    console.error('SubShelf: stored list is unreadable', err)
    return []
  }
}

export async function saveSubs(subs: Sub[]): Promise<void> {
  await Preferences.set({ key: SUBS_KEY, value: JSON.stringify(subs) })
}

export async function loadSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: SETTINGS_KEY })
  if (!value) return defaultSettings
  try {
    const s = JSON.parse(value) as Partial<Settings>
    return {
      theme: ['system', 'light', 'dark'].includes(s.theme as string)
        ? (s.theme as ThemePref)
        : 'system',
      lang: ['system', 'ru', 'en'].includes(s.lang as string) ? (s.lang as LangPref) : 'system',
      refraction: typeof s.refraction === 'boolean' ? s.refraction : true,
      remindHour:
        Number.isInteger(s.remindHour) &&
        (s.remindHour as number) >= 0 &&
        (s.remindHour as number) < 24
          ? (s.remindHour as number)
          : 10,
    }
  } catch {
    return defaultSettings
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(s) })
}

export function exportJson(subs: Sub[]): string {
  return JSON.stringify(
    { app: 'subshelf', version: 1, exportedAt: new Date().toISOString(), subscriptions: subs },
    null,
    2,
  )
}

/** Accepts our export format or a bare array. Throws when nothing usable is inside. */
export function importJson(text: string): Sub[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data)
    ? data
    : (data as { subscriptions?: unknown } | null)?.subscriptions
  const subs = sanitizeList(list)
  if (subs.length === 0) throw new Error('empty backup')
  return subs
}
