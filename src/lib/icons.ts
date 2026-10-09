import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { matchCatalog, norm } from './catalog'
import type { SubIcon } from './dates'

export const faviconUrl = (domain: string, size = 128) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`

/** Domains worth trying for a name that is not in the catalog ("Aqua Voice" → aquavoice.com …). */
export function guessDomains(name: string): string[] {
  const slug = norm(name)
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]/g, '')
  if (slug.length < 2) return []
  return ['com', 'ai', 'app', 'io'].map((tld) => `${slug}.${tld}`)
}

/** Fetches a favicon as a data URL through native HTTP (no WebView CORS). Null when the site has none. */
export async function fetchIconData(domain: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const res = await CapacitorHttp.get({
      url: faviconUrl(domain, 128),
      responseType: 'blob',
      connectTimeout: 6000,
      readTimeout: 6000,
    })
    if (res.status !== 200 || typeof res.data !== 'string' || res.data.length < 200) return null
    const type = (res.headers['Content-Type'] ?? res.headers['content-type'] ?? 'image/png')
      .split(';')[0]
      .trim()
    const url = `data:${type};base64,${res.data}`
    return url.length < 60_000 ? url : null
  } catch {
    return null
  }
}

/** Google answers 404 for domains without a favicon; on the web we cannot read that, so we trust .com. */
async function domainHasIcon(domain: string): Promise<string | null | false> {
  if (!Capacitor.isNativePlatform()) return null
  const data = await fetchIconData(domain)
  return data ?? false
}

/**
 * Resolve an icon for a typed name. Catalog first (instant, offline), then domain guesses online.
 * Only the name (as a domain guess) leaves the phone.
 */
export async function resolveIcon(name: string, online: boolean): Promise<SubIcon> {
  const hit = matchCatalog(name)
  if (hit) return { kind: 'catalog', domain: hit.domain }
  if (!online) return { kind: 'monogram' }
  const domains = guessDomains(name)
  if (!Capacitor.isNativePlatform())
    return domains[0] ? { kind: 'remote', domain: domains[0] } : { kind: 'monogram' }
  for (const domain of domains) {
    const res = await domainHasIcon(domain)
    if (res) return { kind: 'remote', domain, data: res }
  }
  return { kind: 'monogram' }
}

/** Makes sure a saved icon carries cached data so the list works offline. */
export async function withIconData(icon: SubIcon, online: boolean): Promise<SubIcon> {
  if (!online || icon.kind === 'monogram' || !icon.domain || icon.data) return icon
  const data = await fetchIconData(icon.domain)
  return data ? { ...icon, data } : icon
}

export function iconSrc(icon: SubIcon, online: boolean): string | null {
  if (icon.data) return icon.data
  if (online && icon.kind !== 'monogram' && icon.domain) return faviconUrl(icon.domain)
  return null
}
