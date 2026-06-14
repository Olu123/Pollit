import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { audienceId, unsubscribeUrl, NEWSLETTER_FROM } from '@/lib/newsletter'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WEEK_MS = 7 * 86_400_000

interface OptionRow { id: string; text: string; vote_count: number }
interface PulsePoll {
  id: string
  question: string
  category: string
  total_votes: number
  options: OptionRow[]
}
interface Surprise {
  poll: PulsePoll
  a: { text: string; pct: number }
  b: { text: string; pct: number }
  margin: number
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Pull this week's public polls and derive the top 5 + closest ("most surprising") races.
async function getWeekly(): Promise<{ top5: PulsePoll[]; surprising: Surprise[] }> {
  const weekStartIso = new Date(Date.now() - WEEK_MS).toISOString()
  const { data } = await supabase
    .from('polls')
    .select('id, question, category, total_votes, options:poll_options ( id, text, vote_count )')
    .eq('is_community', false)
    .is('deleted_at', null)
    .gte('created_at', weekStartIso)
    .order('total_votes', { ascending: false })
    .limit(100)

  const polls: PulsePoll[] = (data ?? []).map((p) => ({
    id: p.id,
    question: p.question,
    category: p.category,
    total_votes: p.total_votes,
    options: (p.options ?? []) as OptionRow[],
  }))

  const top5 = polls.slice(0, 5)

  const surprising: Surprise[] = polls
    .filter((p) => p.options.length >= 2 && p.total_votes > 0)
    .map((p) => {
      const total = p.options.reduce((s, o) => s + o.vote_count, 0) || p.total_votes
      const sorted = [...p.options].sort((a, b) => b.vote_count - a.vote_count)
      const pct = (o: OptionRow) => (total > 0 ? Math.round((o.vote_count / total) * 100) : 0)
      return {
        poll: p,
        a: { text: sorted[0].text, pct: pct(sorted[0]) },
        b: { text: sorted[1].text, pct: pct(sorted[1]) },
        margin: pct(sorted[0]) - pct(sorted[1]),
      }
    })
    .sort((x, y) => x.margin - y.margin)
    .slice(0, 3)

  return { top5, surprising }
}

function emailHtml(top5: PulsePoll[], surprising: Surprise[], email: string) {
  const unsub = unsubscribeUrl(email)

  const topRows = top5
    .map((p, i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
          <a href="${SITE_URL}/polls/${p.id}" style="color:#171717;text-decoration:none;font-weight:700;font-size:15px">
            ${i + 1}. ${esc(p.question)}
          </a>
          <div style="color:#71717a;font-size:13px;margin-top:2px">${esc(p.category)} · ${p.total_votes.toLocaleString()} votes</div>
        </td>
      </tr>`)
    .join('')

  const surpriseRows = surprising
    .map((s) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
          <a href="${SITE_URL}/polls/${s.poll.id}" style="color:#171717;text-decoration:none;font-weight:700;font-size:15px">
            ${esc(s.poll.question)}
          </a>
          <div style="color:#71717a;font-size:13px;margin-top:4px">
            ${esc(s.a.text)} <strong>${s.a.pct}%</strong> &nbsp;vs&nbsp; ${esc(s.b.text)} <strong>${s.b.pct}%</strong>
            &nbsp;— just ${s.margin}% apart 👀
          </div>
        </td>
      </tr>`)
    .join('')

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
    <div style="background:#DC2626;color:#fff;padding:20px;text-align:center">
      <div style="font-weight:800;font-size:20px">🇳🇬 The Nigerian Pulse</div>
      <div style="font-size:13px;opacity:0.9;margin-top:4px">What Nigeria is thinking this week</div>
    </div>
    <div style="padding:20px;color:#171717">
      <h2 style="font-size:16px;margin:0 0 4px">🔥 Top 5 Polls This Week</h2>
      <table style="width:100%;border-collapse:collapse">${topRows}</table>

      ${surprising.length ? `
      <h2 style="font-size:16px;margin:24px 0 4px">😮 Most Surprising Results</h2>
      <p style="color:#71717a;font-size:13px;margin:0 0 4px">The closest, most-contested races.</p>
      <table style="width:100%;border-collapse:collapse">${surpriseRows}</table>` : ''}

      <div style="text-align:center;margin:28px 0 8px">
        <a href="${SITE_URL}/pulse" style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:999px">
          See the full Pulse →
        </a>
      </div>
    </div>
    <div style="padding:16px 20px;background:#fafafa;border-top:1px solid #f0f0f0;color:#a1a1aa;font-size:12px;text-align:center">
      <p style="margin:0 0 6px">You're receiving this because you opted in to the WePollit weekly digest.</p>
      <p style="margin:0">
        <a href="${unsub}" style="color:#71717a;text-decoration:underline">Unsubscribe</a> ·
        <a href="${SITE_URL}" style="color:#71717a;text-decoration:underline">wepollit.com</a>
      </p>
    </div>
  </div>`
}

export async function GET(request: Request) {
  // Authorize: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
  // Enforced only when CRON_SECRET is configured (so it works locally without one).
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const aud = audienceId()
  if (!process.env.RESEND_API_KEY || !aud) {
    return NextResponse.json({ skipped: 'resend_not_configured' })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { top5, surprising } = await getWeekly()
  if (top5.length === 0) {
    return NextResponse.json({ skipped: 'no_polls_this_week' })
  }

  // Recipients = active (non-unsubscribed) contacts in the audience.
  // NOTE: very large audiences may paginate (has_more); extend with pagination if needed.
  const list = await resend.contacts.list({ audienceId: aud })
  const recipients = (list.data?.data ?? [])
    .filter((c) => !c.unsubscribed && c.email)
    .map((c) => c.email)

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no_recipients' })
  }

  const subject = "🇳🇬 The Nigerian Pulse — this week's top polls"
  let sent = 0
  // Resend batch send accepts up to 100 messages per call.
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const payload = chunk.map((email) => ({
      from: NEWSLETTER_FROM,
      to: email,
      subject,
      html: emailHtml(top5, surprising, email),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl(email)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }))
    try {
      await resend.batch.send(payload)
      sent += chunk.length
    } catch (e) {
      console.error('[weekly-pulse] batch send failed:', e)
    }
  }

  return NextResponse.json({ sent, recipients: recipients.length, polls: top5.length })
}
