'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Users, Clock, CheckCircle2, Loader2, Star, MessageCircle } from 'lucide-react'
import type { Poll, PollOption, PollComment } from '@/lib/types'
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

function fmtVotes(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const AVATAR_PALETTE = [
  '#16a34a', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#0891b2', '#be185d', '#0d9488',
]

function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

const CATEGORY_STYLES: Record<string, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

const MAX_COMMENT = 280

export default function VotingPanel({ poll: initialPoll }: { poll: Poll }) {
  const { user } = useAuth()

  const [poll, setPoll]            = useState(initialPoll)
  const [votedOptionId, setVoted]  = useState<string | null>(null)
  const [votedChecked, setChecked] = useState(false)
  const [selectedId, setSelected]  = useState<string | null>(null)
  const [comment, setComment]      = useState('')
  const [voting, setVoting]        = useState(false)
  const [voteError, setVoteError]  = useState('')
  const [comments, setComments]    = useState<PollComment[]>([])

  const isExpired   = new Date(poll.expires_at).getTime() <= Date.now()
  const showResults = !!votedOptionId || isExpired || !user
  const total       = poll.options.reduce((s, o) => s + o.vote_count, 0)

  // Load the comment feed for this poll
  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select('id, comment, created_at, profile:profiles!user_id ( username, full_name )')
      .eq('poll_id', poll.id)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: PollComment[] = (data ?? []).map((row: any) => {
      const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
      return {
        id: row.id,
        comment: row.comment,
        created_at: row.created_at,
        username: prof?.username ?? null,
        full_name: prof?.full_name ?? null,
      }
    })
    setComments(mapped)
  }, [poll.id])

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

  // Initial comment load
  useEffect(() => { loadComments() }, [loadComments])

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        const row = payload.new as { poll_id: string; comment: string | null }
        if (row.poll_id === poll.id && row.comment) loadComments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poll.id, loadComments])

  async function submitVote() {
    if (!user || !selectedId) return
    setVoting(true)
    setVoteError('')

    const { error } = await supabase.rpc('cast_vote', {
      p_poll_id:   poll.id,
      p_option_id: selectedId,
      p_comment:   comment.trim() || null,
    })

    if (error) {
      setVoteError(
        error.message.includes('already_voted')
          ? 'You have already voted on this poll.'
          : error.message
      )
      setVoting(false)
      return
    }

    setVoted(selectedId)
    setPoll((prev) => ({
      ...prev,
      total_votes: prev.total_votes + 1,
      options: prev.options.map((o) =>
        o.id === selectedId ? { ...o, vote_count: o.vote_count + 1 } : o
      ),
    }))
    setVoting(false)
    if (comment.trim()) loadComments()
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

      {/* Vote selection OR results */}
      {showResults ? (
        <ResultsBars results={results} votedOptionId={votedOptionId} total={total} />
      ) : (
        <div className="flex flex-col gap-3">
          {poll.options
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((opt) => {
              const isSel = selectedId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
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

          {/* Optional comment — appears once an option is chosen */}
          {selectedId && (
            <div className="flex flex-col gap-3 pt-1">
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                  placeholder="Add a comment (optional)"
                  rows={3}
                  maxLength={MAX_COMMENT}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                  {comment.length}/{MAX_COMMENT}
                </p>
              </div>
              <button
                onClick={submitVote}
                disabled={voting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {voting ? (
                  <><Loader2 size={17} className="animate-spin" /> Submitting…</>
                ) : (
                  'Submit Vote (+10 tokens)'
                )}
              </button>
            </div>
          )}
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
            <Star size={11} /> +10 tokens
          </span>
        </div>
      )}

      {/* Unauthenticated prompt */}
      {!user && !isExpired && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to cast your vote and earn{' '}
            <span className="text-primary font-semibold">+10 tokens</span>.
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

      {/* Comments feed */}
      {comments.length > 0 && <CommentsFeed comments={comments} />}
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

// ── Comments feed ─────────────────────────────────────────────

function CommentsFeed({ comments }: { comments: PollComment[] }) {
  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-border">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <MessageCircle size={15} strokeWidth={2.5} />
        Comments
        <span className="text-muted-foreground font-normal">({comments.length})</span>
      </h2>
      <div className="flex flex-col gap-4">
        {comments.map((c) => {
          const name = c.username ?? c.full_name ?? 'Anonymous'
          const initial = name.charAt(0).toUpperCase()
          return (
            <div key={c.id} className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
                style={{ backgroundColor: avatarColor(name) }}
                aria-hidden="true"
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/80 leading-snug break-words mt-0.5">
                  {c.comment}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
