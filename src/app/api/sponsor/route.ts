import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

// Sponsorship enquiries go to the brand inbox.
const NOTIFY_TO = 'hello@wepollit.com'

const TIERS = ['₦50,000', '₦200,000', '₦500,000'] as const

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function emailHtml(d: { name: string; email: string; org: string; tier: string; message: string; date: string }) {
  return `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
    <div style="background:#DC2626;color:#fff;padding:16px 20px;font-weight:800;font-size:16px">🔴 WePollit — New Sponsorship Enquiry</div>
    <div style="padding:20px;color:#171717;font-size:14px;line-height:1.6">
      <p style="margin:0 0 4px"><strong>From:</strong> ${esc(d.name)}</p>
      <p style="margin:0 0 4px"><strong>Email:</strong> ${esc(d.email)}</p>
      <p style="margin:0 0 4px"><strong>Organisation:</strong> ${esc(d.org || '—')}</p>
      <p style="margin:0 0 4px"><strong>Tier:</strong> ${esc(d.tier)}</p>
      <p style="margin:0 0 4px"><strong>Date:</strong> ${esc(d.date)}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />
      <p style="margin:0 0 8px"><strong>Message:</strong></p>
      <p style="margin:0;white-space:pre-wrap">${esc(d.message)}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />
      <p style="margin:0;color:#71717a;font-size:12px">Reply directly to ${esc(d.email)} to respond.</p>
      <p style="margin:8px 0 0;color:#71717a;font-size:12px">wepollit.com</p>
    </div>
  </div>`
}

export async function POST(request: Request) {
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = (body.name ?? '').trim()
  const email = (body.email ?? '').trim()
  const org = (body.org ?? '').trim()
  const tier = (body.tier ?? '').trim()
  const message = (body.message ?? '').trim()

  // Validation
  if (!name || !email || !tier || !message) {
    return NextResponse.json({ error: 'All required fields must be filled.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (!TIERS.includes(tier as (typeof TIERS)[number])) {
    return NextResponse.json({ error: 'Invalid sponsorship tier.' }, { status: 400 })
  }
  if (message.length < 20 || message.length > 1000) {
    return NextResponse.json({ error: 'Message must be 20–1000 characters.' }, { status: 400 })
  }

  // Rate limit: max 3 per email per hour (reuses the contact-messages counter).
  const { data: recent } = await supabase.rpc('count_recent_contacts', { p_email: email })
  if (typeof recent === 'number' && recent >= 3) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 })
  }

  // Persist into contact_messages so it shows up in the admin inbox.
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name,
    email,
    subject: `Sponsorship — ${tier}`,
    message: org ? `Organisation: ${org}\n\n${message}` : message,
    username: null,
    user_id: null,
  })
  if (dbError) {
    console.error('[sponsor] supabase insert error:', dbError)
    return NextResponse.json({ error: 'Could not save your enquiry. Please try again.' }, { status: 500 })
  }

  // Send notification email (non-fatal if it fails / no key configured).
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'WePollit <onboarding@resend.dev>',
        to: NOTIFY_TO,
        replyTo: email,
        subject: `[WePollit Sponsorship] ${tier} — from ${name}`,
        html: emailHtml({ name, email, org, tier, message, date: new Date().toUTCString() }),
      })
    } catch (e) {
      console.error('[sponsor] resend exception:', e)
    }
  }

  return NextResponse.json({ success: true })
}
