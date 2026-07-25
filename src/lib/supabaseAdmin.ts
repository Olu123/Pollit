import 'server-only'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Service-role client for trusted, server-only contexts (cron routes,
// signed-unsubscribe links) that need to bypass RLS entirely — e.g.
// resolving auth.users emails via cron_get_user_emails(), or writing a
// notification preference for a user who has no active session. Never
// import this into a Client Component or an unauthenticated-reachable
// code path that doesn't independently verify the caller first
// (CRON_SECRET, an HMAC token, etc.).
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
)
