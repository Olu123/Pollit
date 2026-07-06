'use client'

import { MessageCircle } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import ReportButton from '@/components/ReportButton'
import type { PollComment } from '@/lib/types'

const AVATAR_PALETTE = [
  '#16a34a', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#0891b2', '#be185d', '#0d9488',
]

function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function CommentsFeed({ comments }: { comments: PollComment[] }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-border">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <MessageCircle size={15} strokeWidth={2.5} />
        {t('comments.title')}
        <span className="text-muted-foreground font-normal">({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('comments.empty')}
        </p>
      ) : (
      <div className="flex flex-col gap-4">
        {comments.map((c) => {
          const handle  = c.username ? `@${c.username}` : 'Anonymous'
          const initials = c.username ? c.username.slice(0, 2).toUpperCase() : '?'
          return (
            <div key={c.id} className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none"
                style={{ backgroundColor: avatarColor(c.username ?? c.id) }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{handle}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                  <span className="ml-auto shrink-0"><ReportButton commentId={c.id} size={12} /></span>
                </div>
                <p className="text-sm text-foreground/80 leading-snug break-words mt-0.5">
                  {c.comment}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
