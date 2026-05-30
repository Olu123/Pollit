'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Gift, Copy, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import { shareMessages, whatsappHref } from '@/lib/share'
import { SITE_DOMAIN } from '@/lib/site'

export default function InvitePage() {
  const { user, profile, loading } = useAuth()
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<{ count: number; tokens: number } | null>(null)

  const username = profile?.username ?? ''
  const link = `${SITE_DOMAIN}?ref=${username}`

  useEffect(() => {
    if (profile) setStats({ count: profile.referral_count ?? 0, tokens: (profile.referral_count ?? 0) * 100 })
  }, [profile])

  function copy() {
    navigator.clipboard?.writeText(`https://${link}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (loading) {
    return <main className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-primary" /></main>
  }

  if (!user || !profile) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center">
          <Gift size={30} className="text-primary" strokeWidth={2} />
        </div>
        <p className="text-sm text-muted-foreground">{t('invite.signIn')}</p>
        <Link href="/login" className="inline-flex items-center bg-primary text-white text-sm font-semibold px-6 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all">
          {t('nav.login')}
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div className="text-center flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#b91c1c] flex items-center justify-center shadow-lg">
          <Gift size={30} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-black text-foreground">{t('invite.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('invite.sub')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 text-center text-sm">
          {t('invite.statsPre')}{' '}
          <span className="font-black text-foreground">{stats.count}</span> {t('invite.statsMid')}{' '}
          <span className="font-black text-primary">{stats.tokens.toLocaleString()}</span> {t('invite.statsPost')}
        </div>
      )}

      {/* Referral link */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-1.5">{t('invite.yourLink')}</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 border border-border rounded-xl px-4 py-3 text-sm bg-muted/50 truncate min-h-[48px] flex items-center">
            {link}
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 bg-muted text-foreground text-sm font-semibold px-4 min-h-[48px] rounded-xl hover:bg-border active:scale-95 transition-all shrink-0"
          >
            {copied ? <><Check size={15} /> {t('invite.copied')}</> : <><Copy size={15} /> {t('invite.copy')}</>}
          </button>
        </div>
      </div>

      {/* WhatsApp share */}
      <a
        href={whatsappHref(shareMessages.invite(username))}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:brightness-95 active:scale-[0.98] transition-all"
      >
        {t('invite.shareBtn')}
      </a>

      <p className="text-center text-xs text-muted-foreground">
        Earn <span className="text-primary font-semibold">100 tokens</span> for each friend who joins with your link.
      </p>
    </main>
  )
}
