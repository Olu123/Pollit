'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Exchange PKCE code for session (Supabase appends ?code=... to callback URL)
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/login' : '/')
      })
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
