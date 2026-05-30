'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, ArrowRight } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

// Shown when a community poll is opened without the correct invite code.
export default function CommunityGate({
  pollId,
  communityName,
}: {
  pollId: string
  communityName: string | null
}) {
  const router = useRouter()
  const { t } = useLanguage()
  const [code, setCode] = useState('')

  function go(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) router.replace(`/polls/${pollId}?code=${encodeURIComponent(code.trim().toUpperCase())}`)
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
        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {t('community.go')} <ArrowRight size={16} />
        </button>
      </form>
    </main>
  )
}
