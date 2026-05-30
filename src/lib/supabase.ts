import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Universal client — safe for Server Components (public reads).
// For authenticated mutations in Client Components, use createClientComponentClient()
// from @supabase/auth-helpers-nextjs so the session cookie is included.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
