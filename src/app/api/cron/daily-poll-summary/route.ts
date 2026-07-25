import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NEWSLETTER_FROM } from '@/lib/newsletter'
import { notificationUnsubscribeUrl } from '@/lib/notifications'
import { SITE_URL } from '@/lib/site'

// Runs daily at 07:00 UTC (08:00 WAT) — see vercel.json.
// (Redeploy trigger: previous push didn't produce a Vercel production build.)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY_MS = 86_400_000

interface OptionRow { id: string; text: string; vote_count: number }
interface PollRow {
  id: string
  question: string
  created_by: string
  expires_at: string
  total_votes: number
  options: OptionRow[]
}
interface PollActivity {
  poll: PollRow
  newVotes: number
  newComments: number
  leadingText: string
  leadingPct: number
  daysLeft: number
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function emailHtml(polls: PollActivity[], dateLabel: string, uid: string) {
  const unsub = notificationUnsubscribeUrl(uid, 'daily_summary')

  const cards = polls.map((a) => {
    const endsAt = new Date(a.poll.expires_at)
    const endsLabel = endsAt.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    return `
      <div style="border:1px solid #e4e4e7;border-radius:12px;padding:16px;margin-bottom:14px">
        <p style="margin:0 0 10px;font-weight:700;font-size:15px;color:#171717">&ldquo;${esc(a.poll.question)}&rdquo;</p>
        <p style="margin:0 0 4px;font-size:13px;color:#171717">↑ <strong>${a.newVotes}</strong> new vote${a.newVotes === 1 ? '' : 's'} today <span style="color:#71717a">(${a.poll.total_votes.toLocaleString()} total votes)</span></p>
        <p style="margin:0 0 4px;font-size:13px;color:#171717">💬 <strong>${a.newComments}</strong> new comment${a.newComments === 1 ? '' : 's'}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#171717">🏆 Leading: <strong>${esc(a.leadingText)}</strong> (${a.leadingPct}%)</p>
        <p style="margin:0 0 12px;font-size:13px;color:#71717a">⏰ Ends: ${endsLabel} (${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} left)</p>
        <a href="${SITE_URL}/polls/${a.poll.id}" style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 18px;border-radius:999px">View Poll →</a>
      </div>`
  }).join('')

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
    <div style="background:#DC2626;color:#fff;padding:20px;text-align:center">
      <div style="font-weight:800;font-size:20px">We+Poll+it</div>
      <div style="font-size:15px;font-weight:700;margin-top:6px">Your Daily Poll Summary</div>
      <div style="font-size:13px;opacity:0.9;margin-top:2px">${dateLabel}</div>
    </div>
    <div style="padding:20px;color:#171717">
      ${cards}
    </div>
    <div style="padding:16px 20px;background:#fafafa;border-top:1px solid #f0f0f0;color:#a1a1aa;font-size:12px;text-align:center">
      <p style="margin:0 0 6px">
        <a href="${SITE_URL}/profile" style="color:#71717a;text-decoration:underline">View all your polls</a>
      </p>
      <p style="margin:0">
        <a href="${unsub}" style="color:#71717a;text-decoration:underline">Unsubscribe from poll summaries</a>
      </p>
    </div>
  </div>`
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: 'resend_not_configured' })
  }

  const now = Date.now()
  const dayAgoIso = new Date(now - DAY_MS).toISOString()
  const thirtyDaysAgoIso = new Date(now - 30 * DAY_MS).toISOString()
  const nowIso = new Date(now).toISOString()

  // Active polls (not expired, not deleted) created within the last 30 days.
  const { data: pollsData } = await supabase
    .from('polls')
    .select('id, question, created_by, expires_at, total_votes, options:poll_options ( id, text, vote_count )')
    .is('deleted_at', null)
    .not('created_by', 'is', null)
    .gte('created_at', thirtyDaysAgoIso)
    .gt('expires_at', nowIso)
    .limit(1000)

  const polls = (pollsData ?? []) as unknown as PollRow[]
  if (polls.length === 0) {
    return NextResponse.json({ skipped: 'no_active_polls' })
  }

  const pollIds = polls.map((p) => p.id)

  // Votes cast on those polls in the last 24 hours (comment != null → a new comment).
  const { data: votesData } = await supabase
    .from('votes')
    .select('poll_id, comment')
    .in('poll_id', pollIds)
    .gte('created_at', dayAgoIso)

  const activity = new Map<string, { votes: number; comments: number }>()
  for (const v of votesData ?? []) {
    const entry = activity.get(v.poll_id) ?? { votes: 0, comments: 0 }
    entry.votes += 1
    if (v.comment) entry.comments += 1
    activity.set(v.poll_id, entry)
  }

  const byCreator = new Map<string, PollActivity[]>()
  for (const poll of polls) {
    const act = activity.get(poll.id)
    if (!act || (act.votes === 0 && act.comments === 0)) continue

    const options = poll.options ?? []
    const total = options.reduce((s, o) => s + o.vote_count, 0)
    const leading = [...options].sort((a, b) => b.vote_count - a.vote_count)[0]
    const leadingPct = total > 0 && leading ? Math.round((leading.vote_count / total) * 100) : 0
    const daysLeft = Math.max(0, Math.ceil((new Date(poll.expires_at).getTime() - now) / DAY_MS))

    const list = byCreator.get(poll.created_by) ?? []
    list.push({
      poll,
      newVotes: act.votes,
      newComments: act.comments,
      leadingText: leading?.text ?? '—',
      leadingPct,
      daysLeft,
    })
    byCreator.set(poll.created_by, list)
  }

  if (byCreator.size === 0) {
    return NextResponse.json({ skipped: 'no_activity_last_24h' })
  }

  // Respect the per-creator opt-out.
  const creatorIds = [...byCreator.keys()]
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, notify_daily_summary')
    .in('id', creatorIds)

  const optedOut = new Set(
    (profilesData ?? []).filter((p) => p.notify_daily_summary === false).map((p) => p.id)
  )
  const eligibleIds = creatorIds.filter((id) => !optedOut.has(id))
  if (eligibleIds.length === 0) {
    return NextResponse.json({ skipped: 'all_recipients_opted_out' })
  }

  const { data: emailRows } = await supabaseAdmin.rpc('cron_get_user_emails', { p_user_ids: eligibleIds })
  const emailById = new Map((emailRows ?? []).map((r: { id: string; email: string }) => [r.id, r.email]))

  const resend = new Resend(process.env.RESEND_API_KEY)
  const dateLabel = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
  const subject = `🗳️ Your WePollit polls — ${dateLabel} activity`

  const payload = eligibleIds
    .map((uid) => ({ uid, email: emailById.get(uid), polls: byCreator.get(uid)! }))
    .filter((x): x is { uid: string; email: string; polls: PollActivity[] } => !!x.email)
    .map(({ uid, email, polls: creatorPolls }) => ({
      from: NEWSLETTER_FROM,
      to: email,
      subject,
      html: emailHtml(creatorPolls, dateLabel, uid),
      headers: {
        'List-Unsubscribe': `<${notificationUnsubscribeUrl(uid, 'daily_summary')}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }))

  if (payload.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_emails_found' })
  }

  let sent = 0
  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100)
    try {
      await resend.batch.send(chunk)
      sent += chunk.length
    } catch (e) {
      console.error('[daily-poll-summary] batch send failed:', e)
    }
  }

  return NextResponse.json({ sent, creators: eligibleIds.length, activePolls: polls.length })
}
