import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { communityAccessCookieName, signCommunityAccess } from '@/lib/communityAccess'

export async function POST(req: NextRequest) {
  let body: { pollId?: string; code?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { pollId, code, password } = body
  if (!pollId || typeof pollId !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: poll, error } = await supabase
    .from('polls')
    .select('id, community_code, community_password')
    .eq('id', pollId)
    .eq('is_community', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !poll) {
    return NextResponse.json({ error: 'Community poll not found' }, { status: 404 })
  }

  if (poll.community_code && (code ?? '').trim().toUpperCase() !== poll.community_code) {
    return NextResponse.json({ error: 'Incorrect invite code' }, { status: 401 })
  }

  if (poll.community_password) {
    const { data: verified, error: rpcError } = await supabase.rpc('verify_community_password', {
      p_poll_id: pollId,
      p_password: password ?? '',
    })
    if (rpcError || !verified) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }
  }

  const cookieStore = await cookies()
  cookieStore.set(communityAccessCookieName(pollId), signCommunityAccess(pollId), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: `/polls/${pollId}`,
    maxAge: 60 * 60 * 6,
  })

  return NextResponse.json({ success: true })
}
