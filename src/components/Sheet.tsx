import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { useBack } from '@/lib/back'
import { cn } from '@/lib/cn'

const DURATION = 280

/** Mount/unmount with a CSS transition: `shown` flips one frame after mount and before unmount. */
function useTransition(open: boolean) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const tm = setTimeout(() => setMounted(false), DURATION)
    return () => clearTimeout(tm)
  }, [open])
  return { mounted, shown }
}

/**
 * Bottom sheet. Plain CSS transform transition (compositor only), solid surface, no blur.
 * `onOpened` fires after the slide-in finishes: focus inputs there so the keyboard never
 * resizes the page mid-animation.
 */
export function Sheet({
  open,
  onClose,
  full,
  onOpened,
  children,
  label,
}: {
  open: boolean
  onClose: () => void
  full?: boolean
  onOpened?: () => void
  children: ReactNode
  label: string
}) {
  const { mounted, shown } = useTransition(open)
  const opened = useRef(onOpened)
  opened.current = onOpened
  useBack(open, onClose)
  if (!mounted) return null
  return (
    <div className="layer">
      <div className={cn('scrim', shown && 'is-open')} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn('sheet', full && 'sheet-full', shown && 'is-open')}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && shown) opened.current?.()
        }}
      >
        <div className="grab" />
        {children}
      </section>
    </div>
  )
}

export interface Choice<T> {
  value: T
  label: string
}

export function ChoiceSheet<T>({
  open,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  open: boolean
  title: string
  options: Choice<T>[]
  value: T | undefined
  onPick: (v: T) => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="sheet-head">
        <span className="t-head line grow">{title}</span>
      </div>
      <div className="sheet-body">
        <div className="group">
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              className="row row-form row-plain"
              onClick={() => {
                onPick(o.value)
                onClose()
              }}
            >
              <span className="t-body line grow">{o.label}</span>
              {o.value === value ? (
                <Check className="acc none" size={20} strokeWidth={2.2} />
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export interface ConfirmState {
  title: string
  body: string
  yes: string
  danger?: boolean
  onYes: () => void
}

export function ConfirmDialog({
  state,
  onClose,
  noLabel,
}: {
  state: ConfirmState | null
  onClose: () => void
  noLabel: string
}) {
  const { mounted, shown } = useTransition(state !== null)
  const last = useRef<ConfirmState | null>(state)
  if (state) last.current = state
  useBack(state !== null, onClose)
  const s = last.current
  if (!mounted || !s) return null
  return (
    <div className="layer">
      <div className={cn('scrim', shown && 'is-open')} onClick={onClose} />
      <div role="alertdialog" aria-modal="true" className={cn('dialog', shown && 'is-open')}>
        <div className="t-head line">{s.title}</div>
        <p className="t-body c2 multi">{s.body}</p>
        <button
          type="button"
          className={cn('btn btn-wide', s.danger ? 'btn-second dng' : 'btn-primary')}
          onClick={() => {
            onClose()
            s.onYes()
          }}
        >
          {s.yes}
        </button>
        <button type="button" className="btn btn-ghost btn-wide" onClick={onClose}>
          {noLabel}
        </button>
      </div>
    </div>
  )
}

export interface ToastState {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export function Toast({ toast, onDone }: { toast: ToastState | null; onDone: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!toast) return
    const a = requestAnimationFrame(() => setShown(true))
    const hide = setTimeout(() => setShown(false), 3800)
    const done = setTimeout(onDone, 4000)
    return () => {
      cancelAnimationFrame(a)
      clearTimeout(hide)
      clearTimeout(done)
      setShown(false)
    }
  }, [toast, onDone])
  if (!toast) return null
  return (
    <div className={cn('toast', shown && 'is-open')} role="status">
      <span className="t-sub line grow">{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          className="toast-btn none"
          onClick={() => {
            toast.action?.run()
            onDone()
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
    </div>
  )
}
