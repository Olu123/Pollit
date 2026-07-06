import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Per-request server client for Server Components / Route Handlers that
// need the caller's verified session (e.g. checking profiles.is_admin).
// Do not cache/share the instance across requests — it's bound to the
// current request's cookies.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component render — cookies are refreshed
          // by proxy.ts on the next request instead.
        }
      },
    },
  })
}
