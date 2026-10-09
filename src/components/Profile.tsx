import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import {
  fmtDate,
  fmtMoney,
  fmtMonthYear,
  monthlyByCurrency,
  mainCurrency,
  round2,
  type Sub,
} from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { Fit } from './Fit'
import { ServiceIcon } from './ServiceIcon'

export function Profile({
  subs,
  name,
  online,
  onRename,
  onRestore,
  onOpenSettings,
}: {
  subs: Sub[]
  name: string | null
  online: boolean
  onRename: () => void
  onRestore: (s: Sub) => void
  onOpenSettings: () => void
}) {
  const { t, locale } = useI18n()
  const live = subs.filter((s) => !s.archivedAt)
  const history = subs
    .filter((s) => s.archivedAt)
    .sort((a, b) => (a.archivedAt! < b.archivedAt! ? 1 : -1))

  const month = monthlyByCurrency(live, (s) => s.status === 'active')
  const cur = mainCurrency(month)
  const m = round2(month.get(cur) ?? 0)
  const saved = monthlyByCurrency(history, () => true)
  const savedCur = mainCurrency(saved)
  const savedV = round2(saved.get(savedCur) ?? 0)
  const display = name ?? t('you')

  const tile = (label: string, values: string[]) => (
    <div className="tile">
      <span className="t-cap c3 line">{label}</span>
      <Fit className="t-tile" variants={values} />
    </div>
  )

  const groups: { month: string; items: Sub[] }[] = []
  for (const s of history) {
    const key = fmtMonthYear(s.archivedAt!, locale)
    const last = groups[groups.length - 1]
    if (last && last.month === key) last.items.push(s)
    else groups.push({ month: key, items: [s] })
  }

  return (
    <div>
      <button type="button" className="profile-head" onClick={onRename}>
        <span className="avatar t-head">{(Array.from(display)[0] ?? '?').toUpperCase()}</span>
        <span className="col grow">
          <span className="t-title line">{display}</span>
          <Fit
            className="t-sub c3"
            variants={[t('localData'), t('localDataShort'), t('localDataTiny')]}
          />
        </span>
      </button>

      <div className="tiles">
        {tile(t('tMonth'), [fmtMoney(m, cur, locale), fmtMoney(m, cur, locale, true)])}
        {tile(t('tYear'), [
          fmtMoney(Math.round(m * 12), cur, locale),
          fmtMoney(Math.round(m * 12), cur, locale, true),
        ])}
        {tile(t('tActive'), [String(live.filter((s) => s.status === 'active').length)])}
        {tile(t('tTrial'), [String(live.filter((s) => s.status === 'trial').length)])}
      </div>

      <div className="sec">
        <span className="t-head line none">{t('history')}</span>
        <span className="t-sub c3 none">{history.length}</span>
        {savedV > 0 ? (
          <Fit
            className="t-sub c3 grow right"
            variants={[
              t('savedSum', { sum: fmtMoney(savedV, savedCur, locale) }),
              t('savedSumShort', { sum: fmtMoney(Math.round(savedV), savedCur, locale) }),
              '',
            ]}
          />
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="group">
          <div className="row row-plain no-press">
            <span className="t-body c3 line">{t('historyEmpty')}</span>
          </div>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.month}>
            <div className="t-cap c3 line month-cap">{g.month.toUpperCase()}</div>
            <div className="group">
              {g.items.map((s) => {
                const price =
                  s.price == null
                    ? ''
                    : `${fmtMoney(s.price, s.currency, locale)}${t(`short${s.cycle}`)}`
                const date = fmtDate(s.archivedAt!, locale)
                return (
                  <div key={s.id} className="row no-press">
                    <ServiceIcon name={s.name} icon={s.icon} size={40} online={online} />
                    <span className="col grow">
                      <span className="t-head line">{s.name}</span>
                      <Fit
                        className="t-sub c3"
                        variants={[
                          price
                            ? `${t('cancelledOn', { date })} · ${price}`
                            : t('cancelledOn', { date }),
                          price ? `${date} · ${price}` : date,
                          date,
                        ]}
                      />
                    </span>
                    <button
                      type="button"
                      className="btn btn-second btn-sm none"
                      onClick={() => onRestore(s)}
                    >
                      {t('restore')}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      <div className="group settings-link">
        <button type="button" className="row row-form row-plain" onClick={onOpenSettings}>
          <SlidersHorizontal size={20} className="c2 none" />
          <span className="t-body line grow">{t('settings')}</span>
          <ChevronRight size={16} className="chev" />
        </button>
      </div>
    </div>
  )
}
