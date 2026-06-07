// Single source of truth for the public site origin used in share links,
// OG images, and transparency UI. To move domains (e.g. to wepollit.com),
// change NEXT_PUBLIC_SITE_URL in Vercel — everything below follows.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL  — explicit, inlined into client + server bundles
//   2. https://VERCEL_URL    — automatic per-deployment fallback (previews)
//   3. http://localhost:3000 — local dev
//
// Note: this is written so precedence is correct — NEXT_PUBLIC_SITE_URL wins
// outright; the VERCEL_URL branch is only reached when it is unset.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export const SITE_NAME = 'Pollit'

// Host without protocol (e.g. "pollit-ng.vercel.app") for compact display
// and share-message links that omit the scheme.
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '')

export function pollPath(id: string) {
  return `/polls/${id}`
}
export function pollUrl(id: string) {
  return `${SITE_URL}/polls/${id}`
}
