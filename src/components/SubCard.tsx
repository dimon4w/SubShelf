import { motion } from 'motion/react'
import { Check, ExternalLink } from 'lucide-react'
import { daysUntil, fmtDate, fmtMoney, type Next, type Sub } from '@/lib/dates'
import { cn, hueOf } from '@/lib/cn'
import { useI18n, type I18n } from '@/lib/i18n'

export type Level = 'late' | 'hot' | 'warm' | 'calm'

export function dueInfo(s: Sub, next: Next | null, today: string, i18n: I18n) {
  const { t, days, locale } = i18n
  if (s.status === 'cancelled') {
    return {
      text: s.cancelledAt
        ? t('cancelledOn', { date: fmtDate(s.cancelledAt, locale) })
        : t('cancelledPlain'),
      level: 'calm' as Level,
    }
  }
  if (!next) return { text: t('dueNoDate'), level: 'calm' as Level }
  const d = daysUntil(next.date, today)
  if (next.overdue) {
    const n = Math.abs(d)
    return { text: t('dueOverdue', { n, days: days(n) }), level: 'late' as Level }
  }
  const when =
    d === 0
      ? t('whenToday')
      : d === 1
        ? t('whenTomorrow')
        : `${t('whenIn', { n: d, days: days(d) })} (${fmtDate(next.date, locale)})`
  const price = s.price != null ? fmtMoney(s.price, s.currency, locale) : ''
  const text = t(s.status === 'trial' ? 'dueTrial' : 'dueActive', { price, when })
    .replace(/\s+/g, ' ')
    .trim()
  return { text, level: (d <= 1 ? 'hot' : d <= 3 ? 'warm' : 'calm') as Level }
}

const STATUS_CLASS = {
  trial: 'bg-warn/12 text-warn',
  active: 'bg-success/12 text-success',
  cancelled: 'bg-hover text-fg-3',
} as const

export function SubCard({
  sub,
  next,
  today,
  selectMode,
  selected,
  onToggle,
  onEdit,
  onCancelLink,
  onMarkCancelled,
}: {
  sub: Sub
  next: Next | null
  today: string
  selectMode: boolean
  selected: boolean
  onToggle: () => void
  onEdit: () => void
  onCancelLink: () => void
  onMarkCancelled: () => void
}) {
  const i18n = useI18n()
  const { t, locale } = i18n
  const due = dueInfo(sub, next, today, i18n)
  const hue = hueOf(sub.name)
  const statusLabel = t(
    sub.status === 'trial'
      ? 'statusTrial'
      : sub.status === 'active'
        ? 'statusActive'
        : 'statusCancelled',
  )
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', visualDuration: 0.28, bounce: 0 }}
      className={cn(
        'glass glass-soft rounded-2xl p-4',
        sub.status === 'cancelled' && 'opacity-60',
        (due.level === 'late' || due.level === 'hot') && 'ring-danger',
        selected && 'outline-2 -outline-offset-2 outline-fg',
      )}
      data-level={due.level}
    >
      <button
        type="button"
        onClick={selectMode ? onToggle : onEdit}
        className="flex w-full items-center gap-3 text-left"
      >
        {selectMode ? (
          <span
            className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full ring-2 ring-line-strong ring-inset transition-colors',
              selected && 'bg-fg text-bg ring-fg',
            )}
          >
            {selected ? <Check className="size-4" strokeWidth={3} /> : null}
          </span>
        ) : null}
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl text-lg font-semibold"
          style={{
            background: `hsl(${hue} 70% 55% / 0.16)`,
            color: `hsl(${hue} 55% var(--avatar-l))`,
          }}
        >
          {Array.from(sub.name)[0]?.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold tracking-[-0.01em]">
            {sub.name}
          </span>
          <span className="tabular block text-sm text-fg-3">
            {sub.price != null
              ? `${fmtMoney(sub.price, sub.currency, locale)} ${t(`per${sub.cycle}`)}`
              : t('priceNone')}
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
            STATUS_CLASS[sub.status],
          )}
        >
          {statusLabel}
        </span>
      </button>

      <p
        className={cn(
          'tabular mt-2.5 text-sm font-medium text-fg-2',
          (due.level === 'late' || due.level === 'hot') && 'text-danger',
          due.level === 'warm' && 'text-warn',
        )}
      >
        {due.text}
      </p>

      {!selectMode && sub.status !== 'cancelled' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onCancelLink} className="pill-btn">
            <ExternalLink /> {t('howToCancel')}
          </button>
          <button type="button" onClick={onMarkCancelled} className="pill-btn pill-ok">
            <Check /> {t('markCancelled')}
          </button>
        </div>
      ) : null}
    </motion.article>
  )
}
