import { useEffect, useRef } from 'react'

/** Android back button: the most recently opened layer closes first. */
const stack: (() => void)[] = []

export function useBack(active: boolean, onBack: () => void) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    if (!active) return
    const handler = () => ref.current()
    stack.push(handler)
    return () => {
      const i = stack.lastIndexOf(handler)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

/** Runs the top handler. Returns false when nothing is open (the app may exit). */
export function popBack(): boolean {
  const top = stack[stack.length - 1]
  if (!top) return false
  top()
  return true
}
