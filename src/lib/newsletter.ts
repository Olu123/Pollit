// Server-only helpers for the newsletter (Resend audience + signed unsubscribe links).
// Do NOT import this into client components — it uses node:crypto and server env vars.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from './site'

// Sender + audience are read from env at call time so missing config degrades
// gracefully (the routes skip the Resend step rather than crashing).
export const NEWSLETTER_FROM = process.env.NEWSLETTER_FROM_ADDRESS || 'WePollit <onboarding@resend.dev>'

export function audienceId(): string | null {
  return process.env.RESEND_AUDIENCE_ID || null
}

function secret(): string {
  const s = process.env.NEWSLETTER_SECRET
  if (!s) throw new Error('NEWSLETTER_SECRET env var is not set')
  return s
}

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

export function unsubscribeToken(email: string): string {
  return createHmac('sha256', secret()).update(normalize(email)).digest('hex')
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false
  const expected = unsubscribeToken(email)
  // Reject length mismatches before timingSafeEqual (which throws on unequal lengths).
  if (expected.length !== token.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(normalize(email))
  const t = unsubscribeToken(email)
  return `${SITE_URL}/api/newsletter/unsubscribe?email=${e}&token=${t}`
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
