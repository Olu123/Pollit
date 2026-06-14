import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { audienceId, isValidEmail } from '@/lib/newsletter'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Updates profiles.newsletter_opt_in for the authenticated caller. We build a
// per-request client carrying the user's access token so RLS (auth.uid() = id)
// authorizes the write — no service-role key needed.
async function setOptInFlag(token: string, optIn: boolean) {
  if (!SUPABASE_URL || !token) return
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  await sb.from('profiles')
    .update({ newsletter_opt_in: optIn, updated_at: new Date().toISOString() })
    .eq('id', user.id)
}

export async function POST(request: Request) {
  let body: { email?: string; subscribe?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const subscribe = body.subscribe !== false // default true

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  // 1. Persist the opt-in flag for signed-in users (best-effort).
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (token) {
    try { await setOptInFlag(token, subscribe) } catch (e) { console.error('[newsletter] flag update failed:', e) }
  }

  // 2. Sync the Resend audience (the source of truth for who gets emailed).
  const aud = audienceId()
  if (process.env.RESEND_API_KEY && aud) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      if (subscribe) {
        await resend.contacts.create({ email, audienceId: aud, unsubscribed: false })
      } else {
        await resend.contacts.remove({ email, audienceId: aud })
      }
    } catch (e) {
      // A duplicate contact on re-subscribe is fine; flip the unsubscribed flag instead.
      if (subscribe) {
        try { await resend.contacts.update({ email, audienceId: aud, unsubscribed: false }) } catch { /* non-fatal */ }
      } else {
        console.error('[newsletter] audience remove failed:', e)
      }
    }
  }

  return NextResponse.json({ success: true })
}
