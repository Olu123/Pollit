'use client'

import { CheckCircle2, Lock, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

interface ResultEntry {
  id: string
  text: string
  vote_count: number
  pct: number
}

export default function ResultsBars({
  results,
  votedOptionId,
  total,
  changeOpen = false,
  changeSecondsLeft = 0,
  changing = false,
  onChange,
  locked = false,
}: {
  results: ResultEntry[]
  votedOptionId: string | null
  total: number
  changeOpen?: boolean
  changeSecondsLeft?: number
  changing?: boolean
  onChange?: (optionId: string) => void
  locked?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4">
      {/* Change-your-vote window banner */}
      {changeOpen && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <RefreshCw size={14} className={changing ? 'animate-spin' : ''} />
          {t('change.banner')} {changeSecondsLeft} {t('change.suffix')}
        </div>
      )}
      {/* Locked badge */}
      {locked && (
        <div className="flex items-center gap-2 bg-muted text-muted-foreground rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Lock size={14} /> {t('vote.locked')}
        </div>
      )}

      {results.map((opt) => {
        const isVoted = opt.id === votedOptionId
        return (
          <div key={opt.id}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className={`text-sm leading-snug ${isVoted ? 'text-primary font-semibold' : 'text-foreground/80 font-medium'}`}>
                {isVoted && (
                  <CheckCircle2 size={13} className="inline mr-1 mb-0.5 shrink-0" />
                )}
                {opt.text}
              </span>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${isVoted ? 'text-primary' : 'text-foreground'}`}>
                {opt.pct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full animate-bar ${isVoted ? 'bg-primary' : 'bg-primary/30'}`}
                style={{ width: `${opt.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {opt.vote_count.toLocaleString()} vote{opt.vote_count !== 1 ? 's' : ''}
              </p>
              {changeOpen && !isVoted && onChange && (
                <button
                  onClick={() => onChange(opt.id)}
                  disabled={changing}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                >
                  {t('change.to')}
                </button>
              )}
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground text-right border-t border-border pt-2.5 mt-1">
        {total.toLocaleString()} {t('vote.totalVotes')}
      </p>
    </div>
  )
}
