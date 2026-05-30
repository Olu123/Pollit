'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Users, Clock, CheckCircle2, Loader2, Star } from 'lucide-react'
import type { Poll, PollOption } from '@/lib/types'
import { useAuth } from './AuthProvider'

function timeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function fmtVotes(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const CATEGORY_STYLES: Record<string, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

export default function VotingPanel({ poll: initialPoll }: { poll: Poll }) {
  const { user } = useAuth()

  const [poll, setPoll]            = useState(initialPoll)
  const [votedOptionId, setVoted]  = useState<string | null>(null)
  const [votedChecked, setChecked] = useState(false)
  const [voting, setVoting]        = useState(false)
  const [voteError, setVoteError]  = useState('')

  const isExpired   = new Date(poll.expires_at).getTime() <= Date.now()
  const showResults = !!votedOptionId || isExpired || !user
  const total       = poll.options.reduce((s, o) => s + o.vote_count, 0)

  // Check if this user already voted
  useEffect(() => {
    if (!user) { setChecked(true); return }
    supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', poll.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVoted(data.option_id as string)
        setChecked(true)
      })
  }, [user, poll.id])

  // Live updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`poll-${poll.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poll_options' }, (payload) => {
        const updated = payload.new as PollOption
        if (updated.poll_id !== poll.id) return
        setPoll((prev) => ({
          ...prev,
          options: prev.options.map((o) =>
            o.id === updated.id ? { ...o, vote_count: updated.vote_count } : o
          ),
        }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls' }, (payload) => {
        const updated = payload.new as { id: string; total_votes: number }
        if (updated.id !== poll.id) return
        setPoll((prev) => ({ ...prev, total_votes: updated.total_votes }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poll.id])

  async function castVote(optionId: string) {
    if (!user) return
    setVoting(true)
    setVoteError('')

    const { error } = await supabase.rpc('cast_vote', {
      p_poll_id:   poll.id,
      p_option_id: optionId,
    })

    if (error) {
      setVoteError(
        error.message.includes('already_voted')
          ? 'You have already voted on this poll.'
          : error.message
      )
    } else {
      setVoted(optionId)
      setPoll((prev) => ({
        ...prev,
        total_votes: prev.total_votes + 1,
        options: prev.options.map((o) =>
          o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
        ),
      }))
    }
    setVoting(false)
  }

  // Results sorted by vote count descending
  const results = [...poll.options]
    .sort((a, b) => b.vote_count - a.vote_count)
    .map((o) => ({
      ...o,
      pct: total > 0 ? Math.round((o.vote_count / total) * 100) : 0,
    }))

  if (!votedChecked) {
    return (
      <div className="flex justify-center py-12 sm:py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Poll meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[poll.category] ?? 'bg-muted text-muted-foreground'}`}>
          {poll.category}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={11} />
          <span>{isExpired ? 'Poll ended' : timeRemaining(poll.expires_at)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Users size={11} />
          <span>{fmtVotes(poll.total_votes)} votes</span>
        </div>
      </div>

      {/* Vote buttons OR results */}
      {showResults ? (
        <ResultsBars results={results} votedOptionId={votedOptionId} total={total} />
      ) : (
        <div className="flex flex-col gap-3">
          {poll.options
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((opt) => (
              <button
                key={opt.id}
                onClick={() => castVote(opt.id)}
                disabled={voting}
                className="w-full text-left px-4 sm:px-5 py-4 min-h-[56px] rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary-light active:scale-[0.98] transition-all duration-150 text-sm font-semibold text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-snug"
              >
                {voting ? (
                  <span className="flex items-center gap-2 justify-center text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Casting vote…
                  </span>
                ) : opt.text}
              </button>
            ))}
        </div>
      )}

      {/* Voted confirmation */}
      {votedOptionId && (
        <div className="flex items-start gap-2.5 bg-primary-light text-primary px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span className="text-sm font-semibold flex-1 leading-snug">
            You voted for{' '}
            <strong>&ldquo;{poll.options.find((o) => o.id === votedOptionId)?.text}&rdquo;</strong>
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold shrink-0 mt-0.5">
            <Star size={11} /> +10 pts
          </span>
        </div>
      )}

      {/* Unauthenticated prompt */}
      {!user && !isExpired && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to cast your vote and earn{' '}
            <span className="text-primary font-semibold">+10 points</span>.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary-dark active:scale-95 transition-all min-h-[48px]"
          >
            Sign in to vote
          </Link>
        </div>
      )}

      {voteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {voteError}
        </p>
      )}
    </div>
  )
}

// ── CSS progress-bar results — works at any width ─────────────

interface ResultEntry {
  id: string
  text: string
  vote_count: number
  pct: number
}

function ResultsBars({
  results,
  votedOptionId,
  total,
}: {
  results: ResultEntry[]
  votedOptionId: string | null
  total: number
}) {
  return (
    <div className="flex flex-col gap-4">
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
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${isVoted ? 'bg-primary' : 'bg-primary/30'}`}
                style={{ width: `${opt.pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {opt.vote_count.toLocaleString()} vote{opt.vote_count !== 1 ? 's' : ''}
            </p>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground text-right border-t border-border pt-2.5 mt-1">
        {total.toLocaleString()} total vote{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
