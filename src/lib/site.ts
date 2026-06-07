// Single source of truth for the public site origin used in share links,
// OG images, and transparency UI. Set NEXT_PUBLIC_SITE_URL to override the
// default (e.g. http://localhost:3000 for local dev, or a preview URL).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://wepollit.com'

export const SITE_NAME = 'Pollit'

// Host without protocol (e.g. "wepollit.com") for compact display
// and share-message links that omit the scheme.
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '')

export function pollPath(id: string) {
  return `/polls/${id}`
}
export function pollUrl(id: string) {
  return `${SITE_URL}/polls/${id}`
}
