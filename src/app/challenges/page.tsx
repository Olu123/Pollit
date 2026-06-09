'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, Users, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import type { Poll } from '@/lib/types'

const CHALLENGE_SELECT = `
  id, question, category, created_by, expires_at, total_votes,
  is_challenge, challenge_pool, challenge_status, challenge_distributed, created_at,
  options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
`

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m left`
  if (h > 0) return `${h}h ${m}m ${s}s left`
  return `${m}m ${s}s left`
}

function ActiveCard({ poll }: { poll: Poll }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const participants = poll.total_votes
  const estimated = participants > 0 ? Math.floor(poll.challenge_pool / participants) : poll.challenge_pool
  const msLeft = new Date(poll.expires_at).getTime() - now
  const ended = msLeft <= 0

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Gold gradient header */}
      <div className="bg-gradient-to-br from-amber-400 to-yellow-500 px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-white" strokeWidth={2.5} />
          <span className="text-xs font-black text-white tracking-wide uppercase">Challenge</span>
        </div>
        <span className="text-xs font-semibold text-amber-900 bg-white/40 px-2.5 py-1 rounded-full">
          {ended ? 'Ended' : timeRemaining(poll.expires_at)}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Question */}
        <p className="text-base font-bold text-foreground leading-snug">{poll.question}</p>

        {/* Pool + estimate */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black text-amber-500 tabular-nums">
            {poll.challenge_pool.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground font-medium mb-0.5">token pool</span>
        </div>

        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-amber-800 font-semibold">
            <Users size={14} />
            {participants.toLocaleString()} {participants === 1 ? 'participant' : 'participants'}
          </div>
          <div className="text-sm font-bold text-amber-700">
            ~{estimated.toLocaleString()} tokens each
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={12} />
          {ended ? 'This challenge has ended' : timeRemaining(poll.expires_at)}
        </div>

        <Link
          href={`/polls/${poll.id}`}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-bold text-sm py-3.5 min-h-[48px] rounded-xl hover:brightness-95 active:scale-[0.98] transition-all"
        >
          <Trophy size={15} strokeWidth={2.5} />
          Join Challenge
        </Link>
      </div>
    </div>
  )
}

function CompletedCard({ poll, userParticipated }: { poll: Poll; userParticipated: boolean }) {
  const participants = poll.total_votes
  const tokensEach = participants > 0 ? Math.floor(poll.challenge_pool / participants) : 0

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm opacity-90">
      {/* Completed header */}
      <div className="bg-muted px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-600" strokeWidth={2.5} />
          <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Completed</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {poll.challenge_distributed ? 'Tokens distributed' : 'Awaiting distribution'}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <p className="text-base font-bold text-foreground leading-snug">{poll.question}</p>

        <div className="bg-muted rounded-xl px-4 py-3 flex flex-col gap-1">
          <p className="text-sm text-foreground font-semibold">
            {participants.toLocaleString()} {participants === 1 ? 'participant' : 'participants'} shared{' '}
            <span className="text-amber-600 font-bold">{tokensEach.toLocaleString()} tokens each</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Pool: {poll.challenge_pool.toLocaleString()} tokens total
          </p>
        </div>

        {userParticipated && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3">
            <CheckCircle2 size={14} strokeWidth={2.5} className="shrink-0" />
            <p className="text-sm font-semibold">
              You earned ~{tokensEach.toLocaleString()} tokens from this challenge!
            </p>
          </div>
        )}

        <Link
          href={`/polls/${poll.id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
        >
          View results →
        </Link>
      </div>
    </div>
  )
}

export default function ChallengesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const [active, setActive] = useState<Poll[]>([])
  const [completed, setCompleted] = useState<Poll[]>([])
  const [participatedIds, setParticipatedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    const now = new Date().toISOString()

    const [activeRes, completedRes] = await Promise.all([
      supabase
        .from('polls')
        .select(CHALLENGE_SELECT)
        .eq('is_challenge', true)
        .eq('challenge_status', 'active')
        .gt('expires_at', now)
        .is('deleted_at', null)
        .order('challenge_pool', { ascending: false }),
      supabase
        .from('polls')
        .select(CHALLENGE_SELECT)
        .eq('is_challenge', true)
        .or('challenge_status.eq.completed,expires_at.lte.' + now)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const activePollsRaw = (activeRes.data ?? []) as unknown as Poll[]
    const completedPollsRaw = (completedRes.data ?? []) as unknown as Poll[]

    setActive(activePollsRaw.map((p) => ({ ...p, options: [...p.options].sort((a, b) => a.display_order - b.display_order) })))
    setCompleted(completedPollsRaw.map((p) => ({ ...p, options: [...p.options].sort((a, b) => a.display_order - b.display_order) })))

    // Check which completed challenges the current user participated in
    if (user && completedPollsRaw.length > 0) {
      const ids = completedPollsRaw.map((p) => p.id)
      const { data: votes } = await supabase
        .from('votes')
        .select('poll_id')
        .eq('user_id', user.id)
        .in('poll_id', ids)
      setParticipatedIds(new Set((votes ?? []).map((v: { poll_id: string }) => v.poll_id)))
    }

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
          <Trophy size={26} className="text-amber-500" strokeWidth={2.5} />
          Challenges
        </h1>
        <p className="text-sm text-muted-foreground">Vote, participate and share in the token pool</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit">
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : tab === 'active' ? (
        active.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy size={40} className="text-amber-200" strokeWidth={1.5} />
            <p className="text-base font-bold text-foreground">No active challenges right now</p>
            <p className="text-sm text-muted-foreground">Check back soon — new challenges drop regularly!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {active.map((poll) => <ActiveCard key={poll.id} poll={poll} />)}
          </div>
        )
      ) : (
        completed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CheckCircle2 size={40} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-base font-bold text-foreground">No completed challenges yet</p>
            <p className="text-sm text-muted-foreground">Join an active challenge to see your results here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {completed.map((poll) => (
              <CompletedCard
                key={poll.id}
                poll={poll}
                userParticipated={participatedIds.has(poll.id)}
              />
            ))}
          </div>
        )
      )}
    </main>
  )
}