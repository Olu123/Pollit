// Server-only helpers for gating password-protected community polls behind
// a signed, per-poll cookie. Do NOT import into client components.
import { createHmac, timingSafeEqual } from 'node:crypto'

function secret(): string {
  const s = process.env.COMMUNITY_ACCESS_SECRET
  if (!s) throw new Error('COMMUNITY_ACCESS_SECRET env var is not set')
  return s
}

export function communityAccessCookieName(pollId: string): string {
  return `ca_${pollId}`
}

export function signCommunityAccess(pollId: string): string {
  return createHmac('sha256', secret()).update(pollId).digest('hex')
}

export function verifyCommunityAccess(pollId: string, token: string | undefined | null): boolean {
  if (!token) return false
  const expected = signCommunityAccess(pollId)
  if (expected.length !== token.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}
