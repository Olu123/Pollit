import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NEWSLETTER_FROM } from '@/lib/newsletter'
import { notificationUnsubscribeUrl } from '@/lib/notifications'
import { shareMessages, whatsappHref } from '@/lib/share'
import { SITE_URL } from '@/lib/site'

// Runs every hour looking for polls entering their final 24h window —
// see vercel.json ("0 * * * *").
//
// NOTE: Vercel Hobby plan only supports daily crons, not hourly ones.
// On Hobby, either upgrade to Vercel Pro, or point a free external
// scheduler (e.g. cron-job.org) at this route once an hour with the
// `Authorization: Bearer ${CRON_SECRET}` header set.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HOUR_MS = 3_600_000

interface OptionRow { id: string; text: string; vote_count: number; display_order: number }
interface PollRow {
  id: string
  question: string
  created_by: string
  expires_at: string
  total_votes: number
  options: OptionRow[]
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function emailHtml(poll: PollRow, uid: string) {
  const unsub = notificationUnsubscribeUrl(uid, 'expiry_reminder')
  const url = `${SITE_URL}/polls/${poll.id}`
  const whatsapp = whatsappHref(shareMessages.newPoll(poll.id, poll.question))
  const closesLabel = new Date(poll.expires_at).toLocaleString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })

  const options = [...poll.options].sort((a, b) => a.display_order - b.display_order)
  const total = options.reduce((s, o) => s + o.vote_count, 0)
  const resultRows = options.map((o) => {
    const pct = total > 0 ? Math.round((o.vote_count / total) * 100) : 0
    return `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#171717">${esc(o.text)}</td>
        <td style="padding:6px 0;font-size:13px;color:#171717;text-align:right;white-space:nowrap"><strong>${pct}%</strong> (${o.vote_count.toLocaleString()} votes)</td>
      </tr>`
  }).join('')

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
    <div style="background:#DC2626;color:#fff;padding:20px;text-align:center">
      <div style="font-weight:800;font-size:20px">⏰ Your poll closes soon!</div>
    </div>
    <div style="padding:20px;color:#171717">
      <p style="margin:0 0 4px;font-size:15px">Your poll is closing soon!</p>
      <p style="margin:0 0 16px;font-weight:700;font-size:17px">&ldquo;${esc(poll.question)}&rdquo;</p>

      <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:.03em">Current results</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 12px">${resultRows}</table>
      <p style="margin:0 0 4px;font-size:13px;color:#171717">Total votes: <strong>${poll.total_votes.toLocaleString()}</strong></p>
      <p style="margin:0 0 20px;font-size:13px;color:#71717a">Closes: ${closesLabel}</p>

      <p style="margin:0 0 8px;font-size:13px;font-weight:700">Want more responses? Share your poll:</p>
      <p style="margin:0 0 20px">
        <a href="${whatsapp}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;margin-right:8px">Share on WhatsApp</a>
        <a href="${url}" style="display:inline-block;background:#f4f4f5;color:#171717;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px">Copy link</a>
      </p>

      <p style="margin:0 0 8px;font-size:13px;font-weight:700">Want more time?</p>
      <p style="margin:0 0 20px">
        <a href="${url}?extend=3" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px;margin-right:8px">Extend by 3 days</a>
        <a href="${url}?extend=7" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px">Extend by 7 days</a>
      </p>

      <a href="${url}" style="display:inline-block;color:#DC2626;text-decoration:none;font-weight:700;font-size:13px">View full results →</a>
    </div>
    <div style="padding:16px 20px;background:#fafafa;border-top:1px solid #f0f0f0;color:#a1a1aa;font-size:12px;text-align:center">
      <a href="${unsub}" style="color:#71717a;text-decoration:underline">Unsubscribe from expiry reminders</a>
    </div>
  </div>`
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const from = new Date(now + 23 * HOUR_MS).toISOString()
  const to = new Date(now + 25 * HOUR_MS).toISOString()

  const { data: pollsData } = await supabase
    .from('polls')
    .select('id, question, created_by, expires_at, total_votes, options:poll_options ( id, text, vote_count, display_order )')
    .is('deleted_at', null)
    .not('created_by', 'is', null)
    .eq('expiry_reminder_sent', false)
    .gte('expires_at', from)
    .lte('expires_at', to)
    .limit(500)

  const polls = (pollsData ?? []) as unknown as PollRow[]
  if (polls.length === 0) {
    return NextResponse.json({ skipped: 'no_polls_expiring_soon' })
  }

  // These are "found" regardless of whether an email actually goes out below
  // (opted out / no email on file) — mark them handled either way so the
  // hourly sweep doesn't keep re-processing the same poll all day.
  const foundIds = polls.map((p) => p.id)

  if (!process.env.RESEND_API_KEY) {
    await supabaseAdmin.from('polls').update({ expiry_reminder_sent: true }).in('id', foundIds)
    return NextResponse.json({ skipped: 'resend_not_configured', marked: foundIds.length })
  }

  const creatorIds = [...new Set(polls.map((p) => p.created_by))]
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, notify_expiry_reminder')
    .in('id', creatorIds)

  const optedOut = new Set(
    (profilesData ?? []).filter((p) => p.notify_expiry_reminder === false).map((p) => p.id)
  )
  const eligiblePolls = polls.filter((p) => !optedOut.has(p.created_by))

  const eligibleCreatorIds = [...new Set(eligiblePolls.map((p) => p.created_by))]
  const { data: emailRows } = eligibleCreatorIds.length
    ? await supabaseAdmin.rpc('cron_get_user_emails', { p_user_ids: eligibleCreatorIds })
    : { data: [] }
  const emailById = new Map((emailRows ?? []).map((r: { id: string; email: string }) => [r.id, r.email]))

  const payload = eligiblePolls
    .map((poll) => ({ poll, email: emailById.get(poll.created_by) }))
    .filter((x): x is { poll: PollRow; email: string } => !!x.email)
    .map(({ poll, email }) => ({
      from: NEWSLETTER_FROM,
      to: email,
      subject: '⏰ Your poll ends in 24 hours — take action now',
      html: emailHtml(poll, poll.created_by),
      headers: {
        'List-Unsubscribe': `<${notificationUnsubscribeUrl(poll.created_by, 'expiry_reminder')}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }))

  let sent = 0
  if (payload.length > 0) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    for (let i = 0; i < payload.length; i += 100) {
      const chunk = payload.slice(i, i + 100)
      try {
        await resend.batch.send(chunk)
        sent += chunk.length
      } catch (e) {
        console.error('[poll-expiry-reminder] batch send failed:', e)
      }
    }
  }

  await supabaseAdmin.from('polls').update({ expiry_reminder_sent: true }).in('id', foundIds)

  return NextResponse.json({ sent, found: foundIds.length })
}
