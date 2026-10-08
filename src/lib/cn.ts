import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** Stable hue per name, so every service gets its own tint (posters do this job in MediaShelf). */
export function hueOf(name: string): number {
  let h = 0
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) % 360
  return h
}
