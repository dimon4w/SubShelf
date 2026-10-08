import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n'

/** Glass bottom sheet with drag-to-dismiss. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass glass-strong relative flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[28px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', visualDuration: 0.34, bounce: 0.08 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" />
            <header className="flex shrink-0 items-center justify-between px-5 pt-2 pb-1">
              <h2 className="text-xl font-semibold tracking-[-0.015em]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="grid size-10 place-items-center rounded-full text-fg-2 active:bg-hover"
              >
                <X className="size-5" />
              </button>
            </header>
            <div
              className="overflow-y-auto px-5 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))]"
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
