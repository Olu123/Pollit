import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { GUEST_SESSION_COOKIE, verifySessionCookie } from '@/lib/guestSession'

// Called once, client-side, right after AuthProvider detects a logged-out
// → logged-in transition (see AuthProvider.tsx). Needs the caller's auth
// session (to know whose account to migrate into), so it uses the
// cookie-based server client rather than the anon one used by the guest
// vote-casting route.
export async function POST() {
  const cookieStore = await cookies()
  const sessionId = verifySessionCookie(cookieStore.get(GUEST_SESSION_COOKIE)?.value)
  if (!sessionId) return NextResponse.json({ migrated: 0 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ migrated: 0 })

  const { data, error } = await supabase.rpc('migrate_guest_votes', { p_session_id: sessionId })
  if (error) return NextResponse.json({ migrated: 0, error: error.message })

  return NextResponse.json(data ?? { migrated: 0 })
}
