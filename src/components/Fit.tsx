import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'

/**
 * One line of text that never wraps: shows the longest variant that fits its box,
 * otherwise the last variant with an ellipsis.
 */
export function Fit({
  variants,
  className,
  style,
}: {
  variants: string[]
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const key = variants.join('\u0000')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const list = key.split('\u0000')
    const fit = () => {
      for (const v of list) {
        el.textContent = v
        if (el.scrollWidth <= el.clientWidth + 1) return
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [key])

  return <span ref={ref} className={cn('line', className)} style={style} title={variants[0]} />
}
