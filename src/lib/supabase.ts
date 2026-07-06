import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[WePollit] Supabase env vars missing. ' +
    'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel project settings.'
  )
}

// Session-aware client backed by cookies (via @supabase/ssr) instead of
// localStorage, so the session is also readable server-side (proxy.ts,
// Server Components) for real auth checks. Safe to import from both
// Client and Server Components — createBrowserClient handles empty strings
// without throwing; queries will return errors gracefully until real env
// vars are provided.
export const supabase = supabaseUrl
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
