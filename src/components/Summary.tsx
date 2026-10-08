import { fmtDate, fmtMoney, monthlyCost, type Next, type Sub } from '@/lib/dates'
import { cn } from '@/lib/cn'
import { useI18n } from '@/lib/i18n'

function sumText(totals: Map<string, number>, locale: string): string | null {
  const parts = [...totals.entries()]
    .filter(([, v]) => v > 0)
    .map(([cur, v]) => fmtMoney(Math.round(v * 100) / 100, cur, locale))
  return parts.length ? parts.join(' + ') : null
}

/** Two glass stat cards, after MediaShelf's StatCard. */
export function Summary({ items }: { items: { s: Sub; next: Next | null }[]; today: string }) {
  const { t, locale } = useI18n()
  const risk = new Map<string, number>()
  const monthly = new Map<string, number>()
  let riskCount = 0
  let activeCount = 0
  let earliest: { s: Sub; next: Next } | null = null

  for (const { s, next } of items) {
    if (s.status === 'trial') {
      riskCount += 1
      risk.set(s.currency, (risk.get(s.currency) ?? 0) + (s.price ?? 0))
      if (next && !next.overdue && (!earliest || next.date < earliest.next.date))
        earliest = { s, next }
    } else if (s.status === 'active') {
      activeCount += 1
      monthly.set(s.currency, (monthly.get(s.currency) ?? 0) + monthlyCost(s))
    }
  }

  const riskSum = sumText(risk, locale)
  return (
    <section className="grid grid-cols-[1.25fr_1fr] gap-3">
      <div
        className={cn('glass flex min-w-0 flex-col rounded-2xl p-4', riskCount > 0 && 'stat-risk')}
      >
        <h2
          className={cn(
            'text-xs font-semibold tracking-[0.04em] uppercase',
            riskCount ? 'text-warn' : 'text-fg-3',
          )}
        >
          {t('riskTitle')}
        </h2>
        <p className="tabular mt-1.5 text-2xl font-semibold tracking-[-0.02em] break-words">
          {riskCount ? (riskSum ?? riskCount) : t('riskNone')}
        </p>
        <p className="mt-1 text-sm text-fg-2">
          {riskCount ? t('riskHint', { count: riskCount }) : t('riskNoneHint')}
          {earliest ? (
            <>
              <br />
              {t('riskNext', { name: earliest.s.name, date: fmtDate(earliest.next.date, locale) })}
            </>
          ) : null}
        </p>
      </div>
      <div className="glass flex min-w-0 flex-col rounded-2xl p-4">
        <h2 className="text-xs font-semibold tracking-[0.04em] text-fg-3 uppercase">
          {t('monthlyTitle')}
        </h2>
        <p className="tabular mt-1.5 text-2xl font-semibold tracking-[-0.02em] break-words">
          {sumText(monthly, locale) ?? '0'}
        </p>
        <p className="mt-1 text-sm text-fg-2">{t('monthlyHint', { n: activeCount })}</p>
      </div>
    </section>
  )
}
