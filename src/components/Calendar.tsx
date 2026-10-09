import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, fmtDate, fmtMonthYear, parseYmd, toYmd } from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/cn'
import { Fit } from './Fit'
import { Sheet } from './Sheet'
import { relWord } from './SubRow'

const monthStart = (ymd: string) => `${ymd.slice(0, 7)}-01`

function shiftMonth(first: string, n: number): string {
  const d = parseYmd(first)
  return toYmd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)))
}

export function CalendarSheet({
  open,
  value,
  today,
  trial,
  onPick,
  onClose,
}: {
  open: boolean
  value: string | null
  today: string
  trial: boolean
  onPick: (ymd: string | null) => void
  onClose: () => void
}) {
  const i18n = useI18n()
  const { t, locale } = i18n
  const [sel, setSel] = useState<string | null>(value)
  const [view, setView] = useState(monthStart(value ?? today))

  useEffect(() => {
    if (open) {
      setSel(value)
      setView(monthStart(value ?? today))
    }
  }, [open, value, today])

  const first = parseYmd(view)
  const lead = (first.getUTCDay() + 6) % 7
  const start = addDays(view, -lead)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const note = sel
    ? [
        t(trial ? 'calTrial' : 'calActive', {
          date: fmtDate(sel, locale, true),
          when: relWord(sel, today, i18n),
        }),
        `${fmtDate(sel, locale)} · ${relWord(sel, today, i18n)}`,
        fmtDate(sel, locale),
      ]
    : [t('calPick')]

  return (
    <Sheet open={open} onClose={onClose} label={t('calPick')}>
      <div className="sheet-head">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('prevMonth')}
          onClick={() => setView(shiftMonth(view, -1))}
        >
          <ChevronLeft size={22} />
        </button>
        <span className="t-head line grow center">{fmtMonthYear(view, locale)}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('nextMonth')}
          onClick={() => setView(shiftMonth(view, 1))}
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div className="sheet-body">
        <div className="cal">
          {t('weekdays')
            .split(',')
            .map((w) => (
              <div key={w} className="cal-w line">
                {w}
              </div>
            ))}
          {days.map((d) => (
            <button
              key={d}
              type="button"
              className={cn(
                'cal-d',
                d.slice(0, 7) !== view.slice(0, 7) && 'is-muted',
                d === today && 'is-today',
                d === sel && 'is-sel',
                d < today && 'is-past',
              )}
              onClick={() => setSel(d)}
            >
              {Number(d.slice(8))}
            </button>
          ))}
        </div>
        <Fit className="t-sub c2 center cal-note" variants={note} />
      </div>
      <div className="sheet-foot row-gap">
        <button
          type="button"
          className="btn btn-second none"
          onClick={() => {
            onPick(null)
            onClose()
          }}
        >
          {t('clearDate')}
        </button>
        <button
          type="button"
          className="btn btn-primary grow"
          onClick={() => {
            onPick(sel)
            onClose()
          }}
        >
          {t('done')}
        </button>
      </div>
    </Sheet>
  )
}
