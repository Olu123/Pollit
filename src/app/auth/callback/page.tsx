'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')
    const type   = params.get('type')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) { router.replace('/login?error=oauth_failed'); return }
        // Password reset flow — send to the reset form
        if (type === 'recovery') {
          router.replace('/auth/reset')
        } else {
          router.replace('/')
        }
      })
    } else if (params.get('error')) {
      // The provider (Google/Facebook/X) sent us back with an error instead
      // of a code (e.g. the user denied the permission request) — route
      // back to login with a friendly flag rather than silently landing on
      // the homepage with no explanation.
      router.replace('/login?error=oauth_failed')
    } else {
      router.replace('/')
    }
  }, [router])

  return (
    <main className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className="text-sm">Completing sign in…</p>
    </main>
  )
}
