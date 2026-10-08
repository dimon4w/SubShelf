import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

/** Segmented control with a sliding highlight (ARIA radiogroup), after MediaShelf's ui/segmented. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  stretch,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentOption<T>[]
  className?: string
  stretch?: boolean
  label: string
}) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'no-scrollbar inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-raised/70 p-1 ring-1 ring-line ring-inset',
        stretch && 'flex w-full',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-base font-medium whitespace-nowrap transition-colors duration-150',
              stretch && 'flex-1',
              active ? 'text-fg' : 'text-fg-3 active:text-fg',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.12)] ring-1 ring-line ring-inset dark:bg-active dark:shadow-none dark:ring-transparent"
                transition={{ type: 'spring', visualDuration: 0.25, bounce: 0 }}
              />
            ) : null}
            <span className="relative inline-flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined ? (
                <span className="tabular text-xs text-fg-3">{o.count}</span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
