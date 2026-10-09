import { Ban, Pencil } from 'lucide-react'
import { fmtDate, type Next, type Sub } from '@/lib/dates'
import { useI18n } from '@/lib/i18n'
import { Fit } from './Fit'
import { ServiceIcon } from './ServiceIcon'
import { Sheet } from './Sheet'
import { priceVariants, relWord } from './SubRow'
import { remindKey } from './SubForm'

export function Detail({
  sub,
  next,
  today,
  online,
  onClose,
  onEdit,
  onCancelSub,
  onDelete,
}: {
  sub: Sub | null
  next: Next | null
  today: string
  online: boolean
  onClose: () => void
  onEdit: (s: Sub) => void
  onCancelSub: (s: Sub) => void
  onDelete: (s: Sub) => void
}) {
  const i18n = useI18n()
  const { t, locale } = i18n
  return (
    <Sheet open={sub !== null} onClose={onClose} label={sub?.name ?? ''}>
      {sub ? (
        <div className="sheet-body">
          <div className="detail-head">
            <ServiceIcon name={sub.name} icon={sub.icon} size={56} online={online} />
            <span className="col grow">
              <span className="t-title line">{sub.name}</span>
              <span className="t-sub c2 line">
                {sub.status === 'trial' ? t('statusTrial') : t('statusActive')}
              </span>
            </span>
          </div>
          <div className="group">
            <InfoRow label={t('fPrice')} values={priceVariants(sub, i18n)} />
            <InfoRow
              label={sub.status === 'trial' ? t('fDateTrial') : t('fDateActive')}
              values={
                next
                  ? [
                      `${fmtDate(next.date, locale)} · ${relWord(next.date, today, i18n)}`,
                      fmtDate(next.date, locale),
                    ]
                  : [t('noDate')]
              }
            />
            <InfoRow
              label={t('fRemind')}
              values={[t(remindKey(sub.remind)), t(remindKey(sub.remind, true))]}
            />
          </div>
          {sub.notes ? (
            <div className="group note-group">
              <p className="t-body multi note-text">{sub.notes}</p>
            </div>
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn btn-second grow" onClick={() => onEdit(sub)}>
              <Pencil size={18} /> <span className="line">{t('edit')}</span>
            </button>
            <button type="button" className="btn btn-second grow" onClick={() => onCancelSub(sub)}>
              <Ban size={18} /> <span className="line">{t('cancelSub')}</span>
            </button>
          </div>
          <button type="button" className="btn btn-danger btn-wide" onClick={() => onDelete(sub)}>
            {t('deleteForever')}
          </button>
        </div>
      ) : null}
    </Sheet>
  )
}

function InfoRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="row row-form row-plain no-press">
      <span className="t-body c2 line none label-col">{label}</span>
      <Fit className="t-body grow right" variants={values} />
    </div>
  )
}
