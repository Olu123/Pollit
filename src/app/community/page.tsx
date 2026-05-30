'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'

export default function CommunityPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function go(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setBusy(true)
    setError('')

    const { data } = await supabase
      .from('polls')
      .select('id')
      .eq('community_code', trimmed)
      .maybeSingle()

    if (data?.id) {
      router.push(`/polls/${data.id}?code=${encodeURIComponent(trimmed)}`)
    } else {
      setError('No community poll found for that code.')
      setBusy(false)
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
        <Users2 size={30} className="text-primary" strokeWidth={2} />
      </div>
      <div>
        <h1 className="text-2xl font-black text-foreground">{t('community.joinTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('community.joinSub')}</p>
      </div>
      <form onSubmit={go} className="w-full flex flex-col gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('community.enterCode')}
          className="w-full border border-border rounded-xl px-4 py-3 text-base text-center font-bold tracking-wider bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[52px]"
        />
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
