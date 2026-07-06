'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, ArrowRight, Loader2 } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

// Shown when a community poll is opened without the correct invite code
// (and password, if the poll has one).
export default function CommunityGate({
  pollId,
  communityName,
  hasPassword,
}: {
  pollId: string
  communityName: string | null
  hasPassword: boolean
}) {
  const router = useRouter()
  const { t } = useLanguage()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function go(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setError('')

    if (!hasPassword) {
      router.replace(`/polls/${pollId}?code=${encodeURIComponent(trimmed)}`)
      return
    }

    setBusy(true)
    const res = await fetch('/api/community/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, code: trimmed, password }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok || !data.success) {
      setError(data.error || 'Could not verify. Please try again.')
      return
    }
    router.replace(`/polls/${pollId}?code=${encodeURIComponent(trimmed)}`)
    router.refresh()
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
        <Users2 size={30} className="text-primary" strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-2xl font-black text-foreground">{t('community.gateTitle')}</h1>
        {communityName && <p className="text-sm font-semibold text-foreground mt-1">{communityName}</p>}
        <p className="text-sm text-muted-foreground mt-1">{t('community.gateSub')}</p>
      </div>
      <form onSubmit={go} className="w-full flex flex-col gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('community.enterCode')}
          className="w-full border border-border rounded-xl px-4 py-3 text-base text-center font-bold tracking-wider bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[52px]"
        />
        {hasPassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('community.enterPassword')}
            className="w-full border border-border rounded-xl px-4 py-3 text-base text-center bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[52px]"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {busy ? <Loader2 size={17} className="animate-spin" /> : <>{t('community.go')} <ArrowRight size={16} /></>}
        </button>
      </form>
    </main>
  )
}
