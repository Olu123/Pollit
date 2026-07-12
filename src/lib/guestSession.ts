// Server-only helpers for the anonymous "guest voting" session cookie.
// Mirrors src/lib/communityAccess.ts's signed-cookie pattern, but here the
// cookie carries a randomly generated session id (not a fixed poll id), so
// the packed value is `<sessionId>.<hmac-of-sessionId>` — signing prevents
// a client from forging someone else's session id and stealing their
// guest votes (and the retroactive tokens) on signup.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const GUEST_SESSION_COOKIE = 'gv_sid'

function secret(): string {
  const s = process.env.GUEST_SESSION_SECRET
  if (!s) throw new Error('GUEST_SESSION_SECRET env var is not set')
  return s
}

function sign(sessionId: string): string {
  return createHmac('sha256', secret()).update(sessionId).digest('hex')
}

export function newSignedSessionCookie(): { sessionId: string; cookieValue: string } {
  const sessionId = randomUUID()
  return { sessionId, cookieValue: `${sessionId}.${sign(sessionId)}` }
}

export function verifySessionCookie(cookieValue: string | undefined | null): string | null {
  if (!cookieValue) return null
  const dot = cookieValue.lastIndexOf('.')
  if (dot <= 0) return null
  const sessionId = cookieValue.slice(0, dot)
  const signature = cookieValue.slice(dot + 1)
  const expected = sign(sessionId)
  if (expected.length !== signature.length) return null
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? sessionId : null
  } catch {
    return null
  }
}
