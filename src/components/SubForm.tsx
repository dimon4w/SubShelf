import { useState, type ReactNode } from 'react'
import { addDays, type Cycle, type Status, type Sub } from '@/lib/dates'
import { normalizeUrl } from '@/lib/store'
import { useI18n } from '@/lib/i18n'
import { Segmented } from './Segmented'

const CURRENCIES = ['USD', 'EUR', 'MDL', 'RUB', 'UAH', 'RON', 'GBP', 'THB']

export interface Draft {
  name: string
  status: Status
  price: string
  currency: string
  cycle: Cycle
  startDate: string
  chargeDate: string
  cancelUrl: string
  notes: string
}

export function draftFrom(s: Sub | null, today: string): Draft {
  if (!s) {
    return {
      name: '',
      status: 'trial',
      price: '',
      currency: 'USD',
      cycle: 'monthly',
      startDate: today,
      chargeDate: '',
      cancelUrl: '',
      notes: '',
    }
  }
  return {
    name: s.name,
    status: s.status,
    price: s.price == null ? '' : String(s.price),
    currency: s.currency,
    cycle: s.cycle,
    startDate: s.startDate ?? '',
    chargeDate: s.chargeDate ?? '',
    cancelUrl: s.cancelUrl ?? '',
    notes: s.notes ?? '',
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg-2">{label}</span>
      {children}
    </label>
  )
}

export function SubForm({
  initial,
  today,
  isEdit,
  onSave,
  onDelete,
}: {
  initial: Draft
  today: string
  isEdit: boolean
  onSave: (fields: Omit<Sub, 'id' | 'createdAt' | 'cancelledAt'>) => void
  onDelete?: () => void
}) {
  const { t } = useI18n()
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }))

  const submit = () => {
    const name = d.name.trim()
    if (!name) return setError(t('errName'))
    const priceRaw = d.price.trim().replace(',', '.')
    const price = priceRaw === '' ? null : Number(priceRaw)
    if (price !== null && (!Number.isFinite(price) || price < 0)) return setError(t('errPrice'))
    const cancelUrl = normalizeUrl(d.cancelUrl)
    if (d.cancelUrl.trim() && !cancelUrl) return setError(t('errUrl'))
    onSave({
      name: name.slice(0, 80),
      status: d.status,
      price,
      currency: d.currency,
      cycle: d.cycle,
      startDate: d.startDate || null,
      chargeDate: d.chargeDate || null,
      cancelUrl,
      notes: d.notes.trim() || null,
    })
  }

  const chargeLabel =
    d.status === 'trial'
      ? t('fChargeTrial')
      : d.status === 'active'
        ? t('fChargeActive')
        : t('fChargeCancelled')

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label={t('fName')}>
        <input
          className="input"
          value={d.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={t('fNamePh')}
          maxLength={80}
          autoFocus={!isEdit}
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-fg-2">{t('fStatus')}</span>
        <Segmented<Status>
          label={t('fStatus')}
          stretch
          value={d.status}
          onChange={(v) => set('status', v)}
          options={[
            { value: 'trial', label: t('statusTrial') },
            { value: 'active', label: t('statusActive') },
            { value: 'cancelled', label: t('statusCancelled') },
          ]}
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Field label={d.status === 'trial' ? t('fPriceTrial') : t('fPrice')}>
          <input
            className="input tabular"
            value={d.price}
            onChange={(e) => set('price', e.target.value)}
            inputMode="decimal"
            placeholder="9.99"
          />
        </Field>
        <Field label={t('fCurrency')}>
          <select
            className="input"
            value={d.currency}
            onChange={(e) => set('currency', e.target.value)}
          >
            {(CURRENCIES.includes(d.currency) ? CURRENCIES : [d.currency, ...CURRENCIES]).map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>

      <Field label={t('fCycle')}>
        <select
          className="input"
          value={d.cycle}
          onChange={(e) => set('cycle', e.target.value as Cycle)}
        >
          <option value="weekly">{t('cycleweekly')}</option>
          <option value="monthly">{t('cyclemonthly')}</option>
          <option value="yearly">{t('cycleyearly')}</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('fStart')}>
          <input
            className="input tabular"
            type="date"
            value={d.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label={chargeLabel}>
          <input
            className="input tabular"
            type="date"
            value={d.chargeDate}
            onChange={(e) => set('chargeDate', e.target.value)}
          />
        </Field>
      </div>

      {d.status === 'trial' ? (
        <div className="-mt-1 flex flex-wrap gap-2">
          {[7, 14, 30].map((n) => (
            <button
              key={n}
              type="button"
              className="pill-btn"
              onClick={() => set('chargeDate', addDays(d.startDate || today, n))}
            >
              {t('quickDays', { n })}
            </button>
          ))}
        </div>
      ) : null}

      <Field label={t('fCancelUrl')}>
        <input
          className="input"
          value={d.cancelUrl}
          onChange={(e) => set('cancelUrl', e.target.value)}
          inputMode="url"
          autoCapitalize="off"
          placeholder="netflix.com/cancelplan"
        />
      </Field>

      <Field label={t('fNotes')}>
        <textarea
          className="input min-h-20 py-2.5"
          value={d.notes}
          onChange={(e) => set('notes', e.target.value)}
          maxLength={500}
          rows={2}
        />
      </Field>

      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}

      <div className="flex gap-2.5 pt-1">
        <button type="submit" className="btn-primary flex-1">
          {t('save')}
        </button>
        {isEdit && onDelete ? (
          <button type="button" className="btn-danger" onClick={onDelete}>
            {t('delete')}
          </button>
        ) : null}
      </div>
    </form>
  )
}
