'use client'

import { CheckCircle2, Loader2, MapPin } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { NIGERIAN_STATES } from '@/lib/states'
import { lgasForState } from '@/lib/lgas'
import type { PollOption } from '@/lib/types'

export const MAX_COMMENT = 280

export default function VoteOptionsForm({
  options,
  selectedId,
  onSelect,
  voting,
  comment,
  onCommentChange,
  voteState,
  onStateChange,
  voteLga,
  onLgaChange,
  onSubmit,
  isChallenge,
  isGuest = false,
}: {
  options: PollOption[]
  selectedId: string | null
  onSelect: (optionId: string) => void
  voting: boolean
  comment: string
  onCommentChange: (value: string) => void
  voteState: string
  onStateChange: (value: string) => void
  voteLga: string
  onLgaChange: (value: string) => void
  onSubmit: () => void
  isChallenge: boolean
  // Guest votes aren't stored with a comment/state/LGA (see guest_votes
  // schema) and don't earn tokens until the vote is migrated on signup.
  isGuest?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-3">
      {options
        .slice()
        .sort((a, b) => a.display_order - b.display_order)
        .map((opt) => {
          const isSel = selectedId === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              disabled={voting}
              aria-pressed={isSel}
              className={`w-full flex items-center justify-between gap-3 text-left px-4 sm:px-5 py-4 min-h-[56px] rounded-2xl border-2 transition-all duration-150 text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-snug ${
                isSel
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary active:scale-[0.98]'
              }`}
            >
              <span>{opt.text}</span>
              {isSel && <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0" />}
            </button>
          )
        })}

      {/* Optional comment + state — appears once an option is chosen */}
      {selectedId && (
        <div className="flex flex-col gap-3 pt-1">
          {!isGuest && (
            <>
              {/* State (optional) — powers the state-by-state breakdown */}
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-primary">
                <MapPin size={15} className="text-muted-foreground shrink-0" />
                <select
                  value={voteState}
                  onChange={(e) => { onStateChange(e.target.value); onLgaChange('') }}
                  className="flex-1 bg-transparent text-base outline-none py-2.5"
                >
                  <option value="">{t('vote.statePlaceholder')}</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* LGA (optional) — only once a state is chosen; powers the LGA breakdown */}
              {voteState && (
                <div className="flex items-center gap-2 border border-border rounded-xl px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-primary">
                  <MapPin size={15} className="text-muted-foreground shrink-0" />
                  <select
                    value={voteLga}
                    onChange={(e) => onLgaChange(e.target.value)}
                    className="flex-1 bg-transparent text-base outline-none py-2.5"
                  >
                    <option value="">{t('vote.lgaPlaceholder')}</option>
                    {lgasForState(voteState).map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => onCommentChange(e.target.value.slice(0, MAX_COMMENT))}
                  placeholder={t('vote.commentPlaceholder')}
                  rows={3}
                  maxLength={MAX_COMMENT}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                  {comment.length}/{MAX_COMMENT}
                </p>
              </div>
            </>
          )}
          <button
            onClick={onSubmit}
            disabled={voting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {voting ? (
              <><Loader2 size={17} className="animate-spin" /> {t('vote.submitting')}</>
            ) : isGuest ? (
              t('vote.submit')
            ) : (
              `${t('vote.submit')} (+${isChallenge ? 7 : 5} tokens)`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
