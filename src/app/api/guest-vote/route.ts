import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { GUEST_SESSION_COOKIE, newSignedSessionCookie, verifySessionCookie } from '@/lib/guestSession'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 90 // 90 days — long enough to cover "vote now, sign up later"

async function hashRequestIp(): Promise<string | null> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')
  if (!ip) return null
  const secret = process.env.GUEST_SESSION_SECRET ?? ''
  return createHash('sha256').update(`${ip}:${secret}`).digest('hex')
}

function errorResponse(message: string) {
  const status =
    message.includes('poll_not_found') ? 404 :
    message.includes('already_voted') || message.includes('poll_ended') ? 409 :
    message.includes('hourly_vote_limit_reached') ? 429 :
    400
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  let body: { pollId?: string; optionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const { pollId, optionId } = body
  if (!pollId || !optionId) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const cookieStore = await cookies()
  let sessionId = verifySessionCookie(cookieStore.get(GUEST_SESSION_COOKIE)?.value)
  let cookieValue = cookieStore.get(GUEST_SESSION_COOKIE)?.value ?? null
  if (!sessionId) {
    const fresh = newSignedSessionCookie()
    sessionId = fresh.sessionId
    cookieValue = fresh.cookieValue
  }

  const ipHash = await hashRequestIp()

  const { error } = await supabase.rpc('cast_guest_vote', {
    p_poll_id: pollId,
    p_option_id: optionId,
    p_session_id: sessionId,
    p_ip_hash: ipHash,
  })

  if (error) return errorResponse(error.message)

  const res = NextResponse.json({ success: true })
  res.cookies.set(GUEST_SESSION_COOKIE, cookieValue!, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}

export async function GET(req: NextRequest) {
  const pollId = req.nextUrl.searchParams.get('poll_id')
  if (!pollId) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  const cookieStore = await cookies()
  const sessionId = verifySessionCookie(cookieStore.get(GUEST_SESSION_COOKIE)?.value)
  if (!sessionId) return NextResponse.json({ voted: false })

  const { data } = await supabase.rpc('get_guest_vote', { p_poll_id: pollId, p_session_id: sessionId })
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return NextResponse.json({ voted: false })

  return NextResponse.json({ voted: true, optionId: row.option_id, votedAt: row.created_at })
}
