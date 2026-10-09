import { memo, useState } from 'react'
import type { SubIcon } from '@/lib/dates'
import { iconSrc } from '@/lib/icons'
import { cn } from '@/lib/cn'

export const ServiceIcon = memo(function ServiceIcon({
  name,
  icon,
  size,
  online,
  loading,
}: {
  name: string
  icon: SubIcon
  size: number
  online: boolean
  loading?: boolean
}) {
  const src = iconSrc(icon, online)
  const [failed, setFailed] = useState<string | null>(null)
  const letter = (Array.from(name.trim())[0] ?? '?').toUpperCase()
  return (
    <span
      className={cn('svc-icon', loading && 'is-loading')}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        fontSize: Math.round(size * 0.42),
      }}
      aria-hidden="true"
    >
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(src)} />
      ) : (
        letter
      )}
    </span>
  )
})
