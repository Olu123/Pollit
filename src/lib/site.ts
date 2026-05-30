// Single source of truth for the public site domain used in share links
// and OG images. Update this if the Vercel domain changes.
export const SITE_DOMAIN = 'pollit-ng.vercel.app'
export const SITE_URL = `https://${SITE_DOMAIN}`

export function pollPath(id: string) {
  return `/polls/${id}`
}
export function pollUrl(id: string) {
  return `${SITE_URL}/polls/${id}`
}
