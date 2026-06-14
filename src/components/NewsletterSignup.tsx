'use client'

import { useState } from 'react'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'

// Compact email-capture form for the site footer (the homepage footer signup).
export default function NewsletterSignup() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const en = lang !== 'pid'

  const [email, setEmail] = useState(user?.email ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(en ? 'Please enter a valid email.' : 'Abeg enter correct email.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    try {
      // Pass the session token when signed in so the opt-in flag is saved too.
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || (en ? 'Something went wrong.' : 'Something do am.'))
        setStatus('error')
        return
      }
      setStatus('done')
    } catch {
      setError(en ? 'Something went wrong.' : 'Something do am.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
        <CheckCircle2 size={16} strokeWidth={2.5} />
        {en ? "You're subscribed! Check your inbox each Monday. 🇳🇬" : 'You don subscribe! Check your mail every Monday. 🇳🇬'}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-sm font-bold text-foreground">
        {en ? '📬 Get the weekly Nigerian Pulse' : '📬 Get the weekly Naija Pulse'}
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {en
          ? 'Top polls and the most surprising results, in your inbox every Monday.'
          : 'Top polls and the most surprising results, for your mail every Monday.'}
      </p>
      <form onSubmit={submit} className="flex w-full max-w-sm items-center gap-2 mt-1">
        <div className="flex flex-1 items-center gap-2 border border-border rounded-full px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-primary bg-card">
          <Mail size={15} className="text-muted-foreground shrink-0" />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder={en ? 'you@email.com' : 'you@email.com'}
            className="flex-1 bg-transparent text-sm outline-none py-2 min-w-0"
            aria-label={en ? 'Email address' : 'Email address'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-60 shrink-0"
        >
          {status === 'loading'
            ? <Loader2 size={15} className="animate-spin" />
            : (en ? 'Subscribe' : 'Subscribe')}
        </button>
      </form>
      {status === 'error' && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
