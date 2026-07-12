'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ToastProvider'
import type { CommentReaction } from '@/lib/types'

export default function CommentReactions({
  voteId,
  isOwnComment,
  agreeCount,
  disagreeCount,
  userReaction,
}: {
  voteId: string
  isOwnComment: boolean
  agreeCount: number
  disagreeCount: number
  userReaction: CommentReaction | null
}) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [agree, setAgree] = useState(agreeCount)
  const [disagree, setDisagree] = useState(disagreeCount)
  const [reaction, setReaction] = useState(userReaction)
  const [busy, setBusy] = useState(false)

  // Comment rows persist across reloads (same key), so re-sync local state
  // when a realtime refresh brings in counts from someone else's reaction.
  useEffect(() => {
    setAgree(agreeCount)
    setDisagree(disagreeCount)
    setReaction(userReaction)
  }, [agreeCount, disagreeCount, userReaction])

  if (isOwnComment) return null

  async function react(next: CommentReaction) {
    if (!user) { showToast(t('vote.signInBtn')); return }
    if (busy) return

    const prevAgree = agree
    const prevDisagree = disagree
    const prevReaction = reaction
    const willClear = reaction === next

    // Optimistic local update — reverted below if the RPC fails.
    setReaction(willClear ? null : next)
    setAgree((n) => n + (next === 'agree' ? (willClear ? -1 : 1) : reaction === 'agree' ? -1 : 0))
    setDisagree((n) => n + (next === 'disagree' ? (willClear ? -1 : 1) : reaction === 'disagree' ? -1 : 0))

    setBusy(true)
    const { data, error } = await supabase.rpc('react_to_comment', {
      p_vote_id: voteId,
      p_reaction: next,
    })
    setBusy(false)

    if (error) {
      setAgree(prevAgree)
      setDisagree(prevDisagree)
      setReaction(prevReaction)
      if (!error.message.includes('cannot_react_to_own_comment')) showToast(error.message)
      return
    }

    setAgree(data.agree_count)
    setDisagree(data.disagree_count)
    setReaction(data.user_reaction)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => react('agree')}
        disabled={busy}
        aria-pressed={reaction === 'agree'}
        aria-label={t('comments.agree')}
        title={t('comments.agree')}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
          reaction === 'agree'
            ? 'bg-primary-light text-primary'
            : 'text-muted-foreground/70 hover:bg-muted hover:text-foreground'
        }`}
      >
        <ThumbsUp size={12} /> {agree > 0 && agree}
      </button>
      <button
        onClick={() => react('disagree')}
        disabled={busy}
        aria-pressed={reaction === 'disagree'}
        aria-label={t('comments.disagree')}
        title={t('comments.disagree')}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
          reaction === 'disagree'
            ? 'bg-red-50 text-red-600'
            : 'text-muted-foreground/70 hover:bg-muted hover:text-foreground'
        }`}
      >
        <ThumbsDown size={12} /> {disagree > 0 && disagree}
      </button>
    </div>
  )
}
