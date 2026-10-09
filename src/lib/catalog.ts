/** Offline catalog: popular services, matched instantly by name or alias without any network. */
export interface CatalogEntry {
  name: string
  domain: string
  aliases: string[]
}

const RAW: [string, string, string[]][] = [
  ['Netflix', 'netflix.com', ['нетфликс']],
  ['Spotify Premium', 'spotify.com', ['spotify', 'спотифай']],
  ['YouTube Premium', 'youtube.com', ['youtube', 'ютуб']],
  ['YouTube Music', 'music.youtube.com', ['ютуб музыка']],
  ['ChatGPT Plus', 'chatgpt.com', ['chatgpt', 'openai', 'чатгпт', 'gpt']],
  ['Claude Pro', 'claude.ai', ['claude', 'anthropic', 'клод']],
  ['Gemini Advanced', 'gemini.google.com', ['gemini', 'гемини']],
  ['Perplexity Pro', 'perplexity.ai', ['perplexity']],
  ['Cursor Pro', 'cursor.com', ['cursor', 'курсор']],
  ['GitHub Copilot', 'github.com', ['copilot', 'github']],
  ['Midjourney', 'midjourney.com', ['mj']],
  ['Aqua Voice', 'aquavoice.com', ['aqua']],
  ['Hoplite', 'hoplite.sh', ['хоплит']],
  ['Notion Plus', 'notion.so', ['notion', 'ноушн']],
  ['Figma Professional', 'figma.com', ['figma', 'фигма']],
  ['Canva Pro', 'canva.com', ['canva', 'канва']],
  ['Adobe Creative Cloud', 'adobe.com', ['adobe', 'photoshop', 'адоб']],
  ['Dropbox Plus', 'dropbox.com', ['dropbox']],
  ['Google One', 'one.google.com', ['google', 'гугл']],
  ['iCloud+', 'icloud.com', ['icloud', 'айклауд']],
  ['Apple Music', 'music.apple.com', ['apple music', 'эпл']],
  ['Apple TV+', 'tv.apple.com', ['apple tv']],
  ['Disney+', 'disneyplus.com', ['disney', 'дисней']],
  ['Prime Video', 'primevideo.com', ['amazon', 'prime', 'амазон']],
  ['HBO Max', 'max.com', ['hbo', 'max']],
  ['Twitch Turbo', 'twitch.tv', ['twitch', 'твич']],
  ['Discord Nitro', 'discord.com', ['discord', 'nitro', 'дискорд']],
  ['Telegram Premium', 'telegram.org', ['telegram', 'телеграм']],
  ['Xbox Game Pass', 'xbox.com', ['xbox', 'game pass', 'иксбокс']],
  ['PlayStation Plus', 'playstation.com', ['ps plus', 'playstation', 'плейстейшен']],
  ['Nintendo Switch Online', 'nintendo.com', ['nintendo']],
  ['EA Play', 'ea.com', ['ea']],
  ['Ubisoft+', 'ubisoft.com', ['ubisoft', 'юбисофт']],
  ['Steam', 'steampowered.com', ['стим']],
  ['Chess.com', 'chess.com', ['chess', 'шахматы']],
  ['Duolingo Super', 'duolingo.com', ['duolingo', 'дуолинго']],
  ['Coursera Plus', 'coursera.org', ['coursera']],
  ['LinkedIn Premium', 'linkedin.com', ['linkedin', 'линкедин']],
  ['X Premium', 'x.com', ['twitter', 'твиттер']],
  ['Yandex Plus', 'plus.yandex.ru', ['yandex', 'яндекс', 'яндекс плюс']],
  ['Кинопоиск', 'kinopoisk.ru', ['kinopoisk']],
  ['VK Музыка', 'vk.com', ['vk', 'вк', 'вконтакте']],
  ['Okko', 'okko.tv', ['окко']],
  ['IVI', 'ivi.ru', ['иви']],
  ['Boosty', 'boosty.to', ['бусти']],
  ['Patreon', 'patreon.com', ['патреон']],
  ['NordVPN', 'nordvpn.com', ['nord', 'vpn']],
  ['ExpressVPN', 'expressvpn.com', ['express']],
  ['TunnelBear', 'tunnelbear.com', ['tunnel']],
  ['Proton', 'proton.me', ['protonmail', 'proton vpn']],
  ['1Password', '1password.com', ['1pass']],
  ['Microsoft 365', 'microsoft.com', ['office', 'microsoft', 'майкрософт']],
  ['Zoom', 'zoom.us', ['зум']],
  ['Slack', 'slack.com', ['слак']],
  ['Gamma', 'gamma.app', ['гамма']],
  ['ElevenLabs', 'elevenlabs.io', ['eleven']],
  ['Grammarly', 'grammarly.com', ['грамарли']],
  ['Strava', 'strava.com', ['страва']],
  ['Headspace', 'headspace.com', []],
  ['Audible', 'audible.com', []],
  ['Kindle Unlimited', 'amazon.com', ['kindle']],
  ['Crunchyroll', 'crunchyroll.com', ['кранчиролл']],
  ['Deezer', 'deezer.com', []],
  ['Tidal', 'tidal.com', []],
  ['SoundCloud Go', 'soundcloud.com', ['soundcloud']],
  ['Netlify Pro', 'netlify.com', ['netlify']],
  ['Vercel Pro', 'vercel.com', ['vercel']],
  ['Supabase', 'supabase.com', []],
  ['JetBrains', 'jetbrains.com', ['intellij', 'webstorm']],
]

export const CATALOG: CatalogEntry[] = RAW.map(([name, domain, aliases]) => ({
  name,
  domain,
  aliases,
}))

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

/** Up to `limit` entries whose name, a word of the name, or an alias starts with the query. */
export function searchCatalog(query: string, limit = 3): CatalogEntry[] {
  const q = norm(query)
  if (!q) return []
  const scored: [number, CatalogEntry][] = []
  for (const c of CATALOG) {
    const n = norm(c.name)
    let score = -1
    if (n === q || c.aliases.some((a) => a === q)) score = 3
    else if (n.startsWith(q)) score = 2
    else if (n.split(' ').some((w) => w.startsWith(q)) || c.aliases.some((a) => a.startsWith(q)))
      score = 1
    if (score >= 0) scored.push([score, c])
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].name.length - b[1].name.length)
    .slice(0, limit)
    .map(([, c]) => c)
}

/** Best confident match for a typed name: exact name/alias, or the only prefix hit. */
export function matchCatalog(name: string): CatalogEntry | null {
  const q = norm(name)
  if (q.length < 2) return null
  const exact = CATALOG.find((c) => norm(c.name) === q || c.aliases.includes(q))
  if (exact) return exact
  const hits = searchCatalog(q, 2)
  return hits.length === 1 ? hits[0] : null
}
