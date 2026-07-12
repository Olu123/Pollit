import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { NEWSLETTER_FROM } from '@/lib/newsletter'

interface Winner {
  rank: number
  user_id: string
  username: string | null
  prize_ngn: number
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'not_authorized' }, { status: 403 })

  const { month, year, winners } = await req.json() as { month: number; year: number; winners: Winner[] }
  if (!Array.isArray(winners) || winners.length === 0) {
    return NextResponse.json({ error: 'no_winners' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: 'resend_not_configured' })
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data: emailRows } = await supabase.rpc('admin_get_user_emails', {
    p_user_ids: winners.map((w) => w.user_id),
  })
  const emailByUserId = new Map((emailRows ?? []).map((r: { id: string; email: string }) => [r.id, r.email]))

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-NG', { month: 'long', year: 'numeric' })
  const rankLabel = (rank: number) => (rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`)

  const payload = winners
    .map((w) => ({ w, email: emailByUserId.get(w.user_id) }))
    .filter((x): x is { w: Winner; email: string } => !!x.email)
    .map(({ w, email }) => ({
      from: NEWSLETTER_FROM,
      to: email,
      subject: `🏆 You placed ${rankLabel(w.rank)} in WePollit's ${monthName} leaderboard!`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 12px">Congratulations${w.username ? `, @${w.username}` : ''}! 🎉</h2>
          <p style="margin:0 0 12px">
            You placed <strong>${rankLabel(w.rank)}</strong> in WePollit's ${monthName} leaderboard and won
            <strong>₦${w.prize_ngn.toLocaleString()}</strong>!
          </p>
          <p style="margin:0">Contact <a href="mailto:hello@wepollit.com">hello@wepollit.com</a> to claim your prize.</p>
        </div>`,
    }))

  if (payload.length === 0) return NextResponse.json({ sent: 0, reason: 'no_emails_found' })

  try {
    await resend.batch.send(payload)
  } catch (e) {
    console.error('[notify-monthly-winners] send failed:', e)
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }

  return NextResponse.json({ sent: payload.length })
}
