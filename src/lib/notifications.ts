// Server-only helpers for poll-creator notification preferences (daily
// activity summary + 24h expiry reminder) — signed unsubscribe links,
// mirroring the newsletter's HMAC pattern in ./newsletter.ts but keyed by
// user id + notification type instead of email, since these preferences
// live on `profiles` rather than a Resend audience.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SITE_URL } from './site'

export type NotificationType = 'daily_summary' | 'expiry_reminder'

const PREF_COLUMN: Record<NotificationType, 'notify_daily_summary' | 'notify_expiry_reminder'> = {
  daily_summary: 'notify_daily_summary',
  expiry_reminder: 'notify_expiry_reminder',
}

export const NOTIFICATION_LABEL: Record<NotificationType, string> = {
  daily_summary: 'daily poll activity summaries',
  expiry_reminder: 'poll expiry reminders',
}

export function isNotificationType(v: string | null): v is NotificationType {
  return v === 'daily_summary' || v === 'expiry_reminder'
}

export function preferenceColumn(type: NotificationType) {
  return PREF_COLUMN[type]
}

function secret(): string {
  const s = process.env.NEWSLETTER_SECRET
  if (!s) throw new Error('NEWSLETTER_SECRET env var is not set')
  return s
}

export function notificationToken(uid: string, type: NotificationType): string {
  return createHmac('sha256', secret()).update(`${uid}:${type}`).digest('hex')
}

export function verifyNotificationToken(uid: string, type: NotificationType, token: string): boolean {
  if (!uid || !type || !token) return false
  const expected = notificationToken(uid, type)
  if (expected.length !== token.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function notificationUnsubscribeUrl(uid: string, type: NotificationType): string {
  const token = notificationToken(uid, type)
  return `${SITE_URL}/api/notifications/unsubscribe?type=${type}&uid=${uid}&token=${token}`
}
