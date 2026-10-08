import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { addDays, fmtDate, fmtMoney, localYmd, upcomingCharges, type Sub } from './dates'
import type { I18n } from './i18n'

const CHANNEL = 'charges'
/** Reminder offsets in days before a charge. Index is part of the notification id. */
const OFFSETS = [-3, -1, 0] as const
/** How many future charges of an active subscription get reminders, so they fire even if the app stays closed. */
const OCCURRENCES = 2

export type NotifState = 'granted' | 'denied' | 'prompt' | 'unsupported'

export const isNative = () => Capacitor.isNativePlatform()

export async function notifState(): Promise<NotifState> {
  if (!isNative()) return 'unsupported'
  const { display } = await LocalNotifications.checkPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

export async function requestNotifs(): Promise<NotifState> {
  if (!isNative()) return 'unsupported'
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

export async function ensureChannel(i18n: I18n): Promise<void> {
  if (!isNative()) return
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: i18n.t('channelName'),
    importance: 4,
    visibility: 1,
  })
}

function atLocal(ymd: string, hour: number): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, hour, 0, 0, 0)
}

export function buildReminders(subs: Sub[], i18n: I18n, hour: number, now = new Date()) {
  const today = localYmd(now)
  const list: LocalNotificationSchema[] = []
  for (const s of subs) {
    upcomingCharges(s, today, OCCURRENCES).forEach((date, occ) => {
      OFFSETS.forEach((offset, k) => {
        const at = atLocal(addDays(date, offset), hour)
        if (at.getTime() <= now.getTime()) return
        const price =
          s.price != null
            ? i18n.t('nPrice', { price: fmtMoney(s.price, s.currency, i18n.locale) })
            : ''
        const title = i18n.t(offset === -3 ? 'n3Title' : offset === -1 ? 'n1Title' : 'n0Title', {
          name: s.name,
        })
        const body = i18n.t(s.status === 'trial' ? 'nBodyTrial' : 'nBodyActive', {
          date: fmtDate(date, i18n.locale),
          price,
        })
        list.push({
          id: s.id * 10 + occ * OFFSETS.length + k,
          title,
          body,
          channelId: CHANNEL,
          schedule: { at, allowWhileIdle: true },
          extra: { subId: s.id },
        })
      })
    })
  }
  return list
}

/** Replace every pending reminder with a fresh set built from the current list. */
export async function reschedule(subs: Sub[], i18n: I18n, hour: number): Promise<void> {
  if ((await notifState()) !== 'granted') return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    })
  }
  const list = buildReminders(subs, i18n, hour)
  if (list.length) await LocalNotifications.schedule({ notifications: list })
}

export async function sendTest(i18n: I18n): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 9,
        title: i18n.t('notifTestTitle'),
        body: i18n.t('notifTestBody'),
        channelId: CHANNEL,
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
      },
    ],
  })
}
