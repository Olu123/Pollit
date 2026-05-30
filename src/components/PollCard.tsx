'use client'

import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import type { Poll, PollCategory } from '@/lib/types'
import { useLanguage } from './LanguageProvider'
import type { StringKey } from '@/lib/i18n'

const SITE = 'agora-ng.vercel.app'

function pollUrl(id: string) {
  return `https://${SITE}/polls/${id}`
}
function shareText(poll: Poll) {
  return `Vote on this poll: ${poll.question} — ${SITE}/polls/${poll.id}`
}
const share = {
  whatsapp: (p: Poll) => `https://wa.me/?text=${encodeURIComponent(shareText(p))}`,
  telegram: (p: Poll) => `https://t.me/share/url?url=${encodeURIComponent(pollUrl(p.id))}&text=${encodeURIComponent(`Vote on this poll: ${p.question}`)}`,
  facebook: (p: Poll) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pollUrl(p.id))}`,
  twitter: (p: Poll) => {
    const text = shareText(p)
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.length > 280 ? text.slice(0, 277) + '…' : text)}`
  },
}

const CATEGORY_STYLES: Record<PollCategory, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

const AVATAR_PALETTE = ['#16a34a', '#2563eb', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#be185d', '#0d9488']
function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

// Colour-coded: green plenty (>24h), amber <24h, red <1h.
function timeColor(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'text-muted-foreground'
  const hours = diff / 3_600_000
  if (hours <= 1) return 'text-red-600'
  if (hours <= 24) return 'text-amber-600'
  return 'text-primary'
}

function fmtVotes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function PollCard({ poll, index = 0 }: { poll: Poll; index?: number }) {
  const { t } = useLanguage()
  const sorted = [...poll.options].sort((a, b) => b.vote_count - a.vote_count)
  const top    = sorted.slice(0, 2)
  const total  = poll.options.reduce((s, o) => s + o.vote_count, 0) || poll.total_votes
  const creator = poll.profile?.username ?? null

  function timeRemaining(): string {
    const diff = new Date(poll.expires_at).getTime() - Date.now()
    if (diff <= 0) return t('card.ended')
    const days = Math.floor(diff / 86_400_000)
    const hours = Math.floor((diff % 86_400_000) / 3_600_000)
    const left = t('card.left')
    if (days > 0) return `${days}d ${hours}h ${left}`
    if (hours > 0) return `${hours}h ${left}`
    return `${Math.floor((diff % 3_600_000) / 60_000)}m ${left}`
  }

  return (
    <article
      className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3.5 animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 9) * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${CATEGORY_STYLES[poll.category]}`}>
          {t(`cat.${poll.category}` as StringKey)}
        </span>
        <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${timeColor(poll.expires_at)}`}>
          <Clock size={11} strokeWidth={2.5} />
          <span>{timeRemaining()}</span>
        </div>
      </div>

      <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-3">{poll.question}</h3>

      <div className="flex flex-col gap-2.5">
        {top.map((opt) => {
          const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
          return (
            <div key={opt.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground/75 truncate">{opt.text}</span>
                <span className="font-semibold text-foreground tabular-nums shrink-0">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary animate-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {creator && (
        <div className="flex items-center gap-2 text-xs">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 select-none"
            style={{ backgroundColor: avatarColor(creator) }}
            aria-hidden="true"
          >
            {creator.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-muted-foreground truncate">@{creator}</span>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-border flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 bg-primary-light text-primary text-xs font-bold px-3 py-1.5 rounded-full">
            <Users size={13} strokeWidth={2.5} />
            {fmtVotes(poll.total_votes)} {t('card.votes')}
          </span>
          <Link
            href={`/polls/${poll.id}`}
            className="flex items-center justify-center h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('card.vote')}
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground shrink-0 mr-0.5">{t('card.share')}</span>
          <ShareBtn href={share.whatsapp(poll)} label="WhatsApp" cls="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20"><WhatsAppIcon /></ShareBtn>
          <ShareBtn href={share.telegram(poll)} label="Telegram" cls="bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20"><TelegramIcon /></ShareBtn>
          <ShareBtn href={share.facebook(poll)} label="Facebook" cls="bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20"><FacebookIcon /></ShareBtn>
          <ShareBtn href={share.twitter(poll)}  label="X"        cls="bg-foreground/8 text-foreground hover:bg-foreground/15"><TwitterXIcon /></ShareBtn>
        </div>
      </div>
    </article>
  )
}

function ShareBtn({ href, label, cls, children }: { href: string; label: string; cls: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
      className={`flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-150 active:scale-95 ${cls}`}>
      {children}
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.054 23.447a.75.75 0 0 0 .916.977l5.7-1.494A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 0 1-5.071-1.38l-.364-.214-3.763.987.999-3.667-.236-.375A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}
function TelegramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
function TwitterXIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}
