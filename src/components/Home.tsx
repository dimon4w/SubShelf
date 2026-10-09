import { Bell, List, Plus } from 'lucide-react'
import { fmtMoney, mainCurrency, monthlyByCurrency, round2, type Next, type Sub } from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { Fit } from './Fit'
import { SubRow, relWord } from './SubRow'

export interface Item {
  s: Sub
  next: Next | null
}

export function Home({
  items,
  loading,
  today,
  online,
  accent,
  onAdd,
  onOpen,
  onLongPress,
}: {
  items: Item[]
  loading: boolean
  today: string
  online: boolean
  accent: boolean
  onAdd: () => void
  onOpen: (s: Sub) => void
  onLongPress: (s: Sub) => void
}) {
  const i18n = useI18n()
  const { t, locale } = i18n

  if (loading) {
    return (
      <div aria-busy="true">
        <div className="summary">
          <div className="skel" style={{ width: '30%' }} />
          <div className="skel" style={{ width: '55%', height: 34, marginTop: 10 }} />
        </div>
        <div className="group">
          {[0, 1, 2].map((i) => (
            <div key={i} className="row">
              <span className="svc-icon" style={{ width: 40, height: 40, borderRadius: 10 }} />
              <span className="col grow">
                <span className="skel" style={{ width: '60%' }} />
                <span className="skel" style={{ width: '35%', height: 10 }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <List size={30} strokeWidth={1.75} />
        </div>
        <div className="t-title line">{t('emptyTitle')}</div>
        <p className="t-body c2 multi">{t('emptyText')}</p>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <Plus size={20} /> {t('addFirst')}
        </button>
      </div>
    )
  }

  const totals = monthlyByCurrency(
    items.map((i) => i.s),
    (s) => s.status === 'active',
  )
  const main = mainCurrency(totals)
  const mainValue = round2(totals.get(main) ?? 0)
  const others = [...totals.keys()].filter((c) => c !== main)
  const soonest = items
    .filter((i) => i.next && !i.next.overdue)
    .sort((a, b) => (a.next!.date < b.next!.date ? -1 : 1))[0]

  const sections: { title: string; list: Item[] }[] = [
    { title: t('trials'), list: items.filter((i) => i.s.status === 'trial') },
    { title: t('actives'), list: items.filter((i) => i.s.status === 'active') },
  ]

  return (
    <div>
      <div className="summary">
        <div className="t-cap c3 line">{t('perMonthCap')}</div>
        <Fit
          className="t-display"
          variants={[fmtMoney(mainValue, main, locale), fmtMoney(mainValue, main, locale, true)]}
        />
        {others.length === 1 ? (
          <Fit
            className="t-sub c2"
            variants={[
              t('moreCur1', {
                sum: fmtMoney(Math.round(totals.get(others[0]) ?? 0), others[0], locale),
              }),
              `+ ${fmtMoney(Math.round(totals.get(others[0]) ?? 0), others[0], locale)}`,
            ]}
          />
        ) : others.length > 1 ? (
          <span className="t-sub c2 line">{t('moreCurN', { n: others.length })}</span>
        ) : null}
        {soonest?.next ? (
          <div className="near">
            <Bell size={16} className="c3 none" />
            <Fit
              className="t-sub c2 grow"
              variants={[
                t('nearest', {
                  name: soonest.s.name,
                  when: relWord(soonest.next.date, today, i18n),
                }),
                t('nearestShort', {
                  name: soonest.s.name,
                  when: relWord(soonest.next.date, today, i18n),
                }),
              ]}
            />
          </div>
        ) : null}
      </div>

      {sections.map((sec) =>
        sec.list.length ? (
          <section key={sec.title}>
            <div className="sec">
              <span className="t-head line">{sec.title}</span>
              <span className="t-sub c3 none">{sec.list.length}</span>
            </div>
            <div className="group">
              {sec.list.map(({ s, next }) => (
                <SubRow
                  key={s.id}
                  sub={s}
                  next={next}
                  today={today}
                  online={online}
                  accent={accent}
                  onOpen={onOpen}
                  onLongPress={onLongPress}
                />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  )
}
