import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

/*
  SETUP RESEND:
  1. Go to resend.com → Sign up free
  2. Go to API Keys → Create API Key
  3. Copy key → add to .env.local as RESEND_API_KEY
  4. Add same key to Vercel → Settings → Environment Variables
  5. Free tier: 100 emails/day, 3000/month — more than enough to start
*/

export const runtime = 'nodejs'

const NOTIFY_TO = 'olusegun.is@gmail.com'
const SUBJECTS = [
  'General Enquiry', 'Report a Problem', 'Partnership / Advertising',
  'Media Enquiry', 'Account Issue', 'Feedback & Suggestions',
  'Token / Rewards Query', 'Other',
]

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function emailHtml(d: { name: string; email: string; username: string; subject: string; message: string; date: string }) {
  return `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
    <div style="background:#DC2626;color:#fff;padding:16px 20px;font-weight:800;font-size:16px">🔴 POLLIT — New Contact Message</div>
    <div style="padding:20px;color:#171717;font-size:14px;line-height:1.6">
      <p style="margin:0 0 4px"><strong>From:</strong> ${esc(d.name)}</p>
      <p style="margin:0 0 4px"><strong>Email:</strong> ${esc(d.email)}</p>
      <p style="margin:0 0 4px"><strong>Username:</strong> ${esc(d.username || 'Guest')}</p>
      <p style="margin:0 0 4px"><strong>Subject:</strong> ${esc(d.subject)}</p>
      <p style="margin:0 0 4px"><strong>Date:</strong> ${esc(d.date)}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />
      <p style="margin:0 0 8px"><strong>Message:</strong></p>
      <p style="margin:0;white-space:pre-wrap">${esc(d.message)}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />
      <p style="margin:0;color:#71717a;font-size:12px">Reply directly to ${esc(d.email)} to respond to this user.</p>
      <p style="margin:8px 0 0;color:#71717a;font-size:12px">wepollit.com</p>
    </div>
  </div>`
}

export async function POST(request: Request) {
  console.log('[contact] route hit')

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const subject = (body.subject ?? '').trim()
  const message = (body.message ?? '').trim()
  const username = (body.username ?? '').trim() || null
  const userId = body.userId || null

  // Validation
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (!SUBJECTS.includes(subject)) {
    return NextResponse.json({ error: 'Invalid subject.' }, { status: 400 })
  }
  if (message.length < 20 || message.length > 1000) {
    return NextResponse.json({ error: 'Message must be 20–1000 characters.' }, { status: 400 })
  }

  // Rate limit: max 3 per email per hour
  const { data: recent } = await supabase.rpc('count_recent_contacts', { p_email: email })
  if (typeof recent === 'number' && recent >= 3) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 })
  }

  // Save to Supabase (anon insert allowed by RLS)
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name, email, subject, message, username, user_id: userId,
  })
  if (dbError) {
    console.error('[contact] supabase insert error:', dbError)
    return NextResponse.json({ error: 'Could not save your message. Please try again.' }, { status: 500 })
  }
  console.log('[contact] message saved to supabase')

  // Send notification email (non-fatal if it fails / no key configured)
  const hasResendKey = !!process.env.RESEND_API_KEY
  console.log('[contact] RESEND_API_KEY defined:', hasResendKey)

  if (hasResendKey) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const sendResult = await resend.emails.send({
        from: 'WePollit <onboarding@resend.dev>',
        to: NOTIFY_TO,
        replyTo: email,
        subject: `[WePollit Contact] ${subject} — from ${name}`,
        html: emailHtml({
          name, email, username: username ?? '', subject, message,
          date: new Date().toUTCString(),
        }),
      })
      console.log('[contact] resend result:', JSON.stringify(sendResult))
    } catch (e) {
      console.error('[contact] resend exception:', e)
    }
  }

  return NextResponse.json({ success: true })
}
