import { Preferences } from '@capacitor/preferences'
import { matchCatalog } from './catalog'
import {
  isValidYmd,
  localYmd,
  REMIND_OPTIONS,
  type Cycle,
  type RemindDays,
  type Sub,
  type SubIcon,
} from './dates'

const SUBS_KEY = 'subshelf.subs.v2'
const SETTINGS_KEY = 'subshelf.settings.v2'
const SUBS_KEY_V1 = 'subshelf.subs.v1'
const SETTINGS_KEY_V1 = 'subshelf.settings.v1'

export type ThemePref = 'system' | 'light' | 'dark'
export type LangPref = 'system' | 'ru' | 'en'
export type Accent = 'mono' | 'blue' | 'cyan' | 'purple' | 'green' | 'orange' | 'pink'
export type Surface = 'solid' | 'glass'

export interface Settings {
  theme: ThemePref
  lang: LangPref
  accent: Accent
  /** 'glass' makes only the bottom bar translucent. Default solid: no blur anywhere. */
  surface: Surface
  /** Local hour for reminder notifications. */
  remindHour: number
  /** Reminder preset for new subscriptions. */
  defaultRemind: RemindDays
  /** Look up service icons online by name (only the name leaves the phone). */
  autoIcons: boolean
  profileName: string | null
}

export const ACCENTS: Accent[] = ['mono', 'blue', 'cyan', 'purple', 'green', 'orange', 'pink']

export const defaultSettings: Settings = {
  theme: 'system',
  lang: 'system',
  accent: 'mono',
  surface: 'solid',
  remindHour: 10,
  defaultRemind: 1,
  autoIcons: true,
  profileName: null,
}

const CYCLES: Cycle[] = ['weekly', 'monthly', 'yearly']

function sanitizeIcon(raw: unknown, name: string): SubIcon {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    const kind = r.kind === 'catalog' || r.kind === 'remote' ? r.kind : 'monogram'
    const domain =
      typeof r.domain === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(r.domain)
        ? r.domain
        : undefined
    const data =
      typeof r.data === 'string' && r.data.startsWith('data:image/') && r.data.length < 60_000
        ? r.data
        : undefined
    if (kind !== 'monogram' && domain) return { kind, domain, data }
    if (kind === 'monogram') return { kind: 'monogram' }
  }
  const hit = matchCatalog(name)
  return hit ? { kind: 'catalog', domain: hit.domain } : { kind: 'monogram' }
}

/**
 * Coerce anything (v2 storage, v1 storage, backups) into a valid v2 Sub, or null.
 * v1 → v2: chargeDate → nextDate, 'cancelled' → archivedAt, cancelUrl kept in notes, startDate dropped.
 */
export function sanitizeSub(raw: unknown, fallbackId: number, today = localYmd()): Sub | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : ''
  if (!name) return null
  const price = r.price === null || r.price === undefined || r.price === '' ? null : Number(r.price)
  const currency = typeof r.currency === 'string' ? r.currency.trim().toUpperCase() : ''
  const date = (v: unknown) => (isValidYmd(v) ? v : null)

  const archivedAt =
    date(r.archivedAt) ?? (r.status === 'cancelled' ? (date(r.cancelledAt) ?? today) : null)

  let notes = typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim() : ''
  const cancelUrl = typeof r.cancelUrl === 'string' ? r.cancelUrl.trim() : ''
  if (cancelUrl && !notes.includes(cancelUrl)) {
    notes = notes ? `${notes}\nСсылка для отмены: ${cancelUrl}` : `Ссылка для отмены: ${cancelUrl}`
  }

  const remind: RemindDays =
    'remind' in r && REMIND_OPTIONS.includes(r.remind as RemindDays) ? (r.remind as RemindDays) : 1

  return {
    id: Number.isInteger(r.id) && (r.id as number) > 0 ? (r.id as number) : fallbackId,
    name,
    status: r.status === 'trial' ? 'trial' : 'active',
    price: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    cycle: CYCLES.includes(r.cycle as Cycle) ? (r.cycle as Cycle) : 'monthly',
    nextDate: date(r.nextDate) ?? date(r.chargeDate),
    remind,
    icon: sanitizeIcon(r.icon, name),
    notes: notes ? notes.slice(0, 600) : null,
    archivedAt,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  }
}

export function sanitizeList(raw: unknown, today = localYmd()): Sub[] {
  if (!Array.isArray(raw)) return []
  const out: Sub[] = []
  const seen = new Set<number>()
  let next = 1
  for (const item of raw) {
    while (seen.has(next)) next++
    const s = sanitizeSub(item, next, today)
    if (!s) continue
    if (seen.has(s.id)) s.id = Math.max(...seen) + 1
    seen.add(s.id)
    out.push(s)
  }
  return out
}

export function sanitizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return defaultSettings
  const s = raw as Record<string, unknown>
  const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback
  return {
    theme: pick(s.theme, ['system', 'light', 'dark'] as const, 'system'),
    lang: pick(s.lang, ['system', 'ru', 'en'] as const, 'system'),
    accent: pick(s.accent, ACCENTS, 'mono'),
    surface: pick(s.surface, ['solid', 'glass'] as const, 'solid'),
    remindHour:
      Number.isInteger(s.remindHour) &&
      (s.remindHour as number) >= 0 &&
      (s.remindHour as number) < 24
        ? (s.remindHour as number)
        : 10,
    defaultRemind: 'defaultRemind' in s ? pick(s.defaultRemind, REMIND_OPTIONS, 1) : 1,
    autoIcons: typeof s.autoIcons === 'boolean' ? s.autoIcons : true,
    profileName:
      typeof s.profileName === 'string' && s.profileName.trim()
        ? s.profileName.trim().slice(0, 40)
        : null,
  }
}

export function nextId(subs: Sub[]): number {
  return subs.reduce((max, s) => Math.max(max, s.id), 0) + 1
}

async function readJson(key: string): Promise<unknown> {
  const { value } = await Preferences.get({ key })
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch (err) {
    console.error(`SubShelf: ${key} is unreadable`, err)
    return undefined
  }
}

/** Loads v2; on first run after the update migrates v1 and writes v2 (v1 stays as a backup). */
export async function loadSubs(): Promise<Sub[]> {
  const v2 = await readJson(SUBS_KEY)
  if (v2 !== undefined) return sanitizeList(v2)
  const v1 = await readJson(SUBS_KEY_V1)
  if (v1 === undefined) return []
  const migrated = sanitizeList(v1)
  await saveSubs(migrated)
  return migrated
}

export async function saveSubs(subs: Sub[]): Promise<void> {
  await Preferences.set({ key: SUBS_KEY, value: JSON.stringify(subs) })
}

export async function loadSettings(): Promise<Settings> {
  const v2 = await readJson(SETTINGS_KEY)
  if (v2 !== undefined) return sanitizeSettings(v2)
  const v1 = await readJson(SETTINGS_KEY_V1)
  return sanitizeSettings(v1)
}

export async function saveSettings(s: Settings): Promise<void> {
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(s) })
}

export function exportJson(subs: Sub[]): string {
  return JSON.stringify(
    { app: 'subshelf', version: 2, exportedAt: new Date().toISOString(), subscriptions: subs },
    null,
    2,
  )
}

/** Accepts v1 and v2 exports or a bare array. Throws when nothing usable is inside. */
export function importJson(text: string): Sub[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data)
    ? data
    : (data as { subscriptions?: unknown } | null)?.subscriptions
  const subs = sanitizeList(list)
  if (subs.length === 0) throw new Error('empty backup')
  return subs
}
