'use client'

import { useRef, useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { Loader2, Download, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'
import { shareMessages, whatsappHref } from '@/lib/share'
import { SITE_DOMAIN } from '@/lib/site'
import type { PollCategory } from '@/lib/types'

const ROWS: { category: PollCategory; emoji: string }[] = [
  { category: 'Politics',      emoji: '🗳️' },
  { category: 'Sports',        emoji: '⚽' },
  { category: 'Entertainment', emoji: '🎵' },
  { category: 'Business',      emoji: '💼' },
  { category: 'Lifestyle',     emoji: '🏙️' },
]

interface CardData {
  picks: Record<string, string | null>
  pollsVoted: number
}

export default function MyNigeriaCard() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const cardRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const generate = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: votes } = await supabase
      .from('votes')
      .select('created_at, category:polls!poll_id ( category ), opt:poll_options!option_id ( text )')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Tally most-frequent chosen option per category.
    const byCat: Record<string, Map<string, number>> = {}
    ;(votes ?? []).forEach((v) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = (Array.isArray(v.category) ? v.category[0] : (v.category as any))?.category
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = (Array.isArray(v.opt) ? v.opt[0] : (v.opt as any))?.text
      if (!cat || !text) return
      const m = byCat[cat] ?? new Map<string, number>()
      m.set(text, (m.get(text) ?? 0) + 1)
      byCat[cat] = m
    })

    const picks: Record<string, string | null> = {}
    for (const { category } of ROWS) {
      const m = byCat[category]
      picks[category] = m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
    }

    setData({ picks, pollsVoted: votes?.length ?? 0 })
    setLoading(false)
  }, [user])

  async function download() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const url = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true })
      const a = document.createElement('a')
      a.href = url
      a.download = `my-nigeria-${profile?.username ?? 'pollit'}.png`
      a.click()
    } catch { /* ignore */ }
    setDownloading(false)
  }

  const username = profile?.username ?? 'you'

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Sparkles size={18} className="text-[#DC2626]" /> My Nigeria Card 🇳🇬
      </h2>

      {!data ? (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? <><Loader2 size={17} className="animate-spin" /> …</> : t('card.generate')}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {/* Card — rendered at 360px, exported at 3× (1080px) */}
          <div
            ref={cardRef}
            style={{ width: 360, height: 360 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm flex items-center gap-1">
                🔴 <span className="text-white">POLLIT</span>
              </span>
              <span className="text-xs text-gray-300">@{username}</span>
            </div>
            <div className="h-px bg-white/20 my-2.5" />
            <p className="text-lg font-black mb-2.5">MY NIGERIA 🇳🇬</p>
            <div className="flex flex-col gap-1.5 flex-1">
              {ROWS.map(({ category, emoji }) => (
                <div key={category} className="flex items-start gap-2 text-[13px] leading-tight">
                  <span>{emoji}</span>
                  <span className="text-gray-400 w-[78px] shrink-0">{category}:</span>
                  <span className="font-semibold text-white flex-1 truncate">
                    {data.picks[category] ?? t('card.deciding')}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-300 mt-2">
              {data.pollsVoted} polls voted · {(profile?.points ?? 0).toLocaleString()} tokens
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{SITE_DOMAIN}</div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={download}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-bold min-h-[48px] rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <><Download size={16} /> {t('card.download')}</>}
            </button>
            <a
              href={whatsappHref(shareMessages.myCard())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm font-bold min-h-[48px] rounded-xl hover:brightness-95 active:scale-95 transition-all"
            >
              {t('card.shareCard')}
            </a>
            <button
              onClick={generate}
              className="px-3 min-h-[48px] text-sm font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
            >
              {t('card.regenerate')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Downloads as a 1080×1080 image. Share the image on WhatsApp with your friends!
          </p>
        </div>
      )}
    </div>
  )
}
