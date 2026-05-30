'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
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

  const isExpired  = new Date(poll.expires_at).getTime() <= Date.now()
  const showResults = !!votedOptionId || isExpired || !user
  const total = poll.options.reduce((s, o) => s + o.vote_count, 0)

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
      // Optimistically update local state (realtime will confirm)
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

  // Chart data, sorted by vote count for display
  const chartData = [...poll.options]
    .sort((a, b) => b.vote_count - a.vote_count)
    .map((o) => ({
      id:       o.id,
      name:     o.text.length > 24 ? o.text.slice(0, 24) + '…' : o.text,
      fullName: o.text,
      votes:    o.vote_count,
      pct:      total > 0 ? Math.round((o.vote_count / total) * 100) : 0,
    }))

  if (!votedChecked) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Poll meta */}
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
        <ResultsChart chartData={chartData} votedOptionId={votedOptionId} total={total} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {poll.options
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((opt) => (
              <button
                key={opt.id}
                onClick={() => castVote(opt.id)}
                disabled={voting}
                className="w-full text-left px-5 py-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary-light transition-all duration-150 text-sm font-semibold text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        <div className="flex items-center gap-2 bg-primary-light text-primary text-sm font-semibold px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} strokeWidth={2.5} />
          <span>
            You voted for{' '}
            <strong>&ldquo;{poll.options.find((o) => o.id === votedOptionId)?.text}&rdquo;</strong>
          </span>
          <span className="ml-auto flex items-center gap-1 text-xs">
            <Star size={11} /> +10 pts
          </span>
        </div>
      )}

      {/* Unauthenticated prompt */}
      {!user && !isExpired && (
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground mb-2">
            Sign in to cast your vote and earn{' '}
            <span className="text-primary font-semibold">+10 points</span>.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
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

// ── Recharts results bar chart ────────────────────────────────

interface ChartEntry {
  id: string; name: string; fullName: string; votes: number; pct: number
}

function ResultsChart({
  chartData, votedOptionId, total,
}: {
  chartData: ChartEntry[]
  votedOptionId: string | null
  total: number
}) {
  const chartHeight = Math.max(chartData.length * 60, 120)

  return (
    <div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 52, bottom: 4, left: 8 }}
          barCategoryGap="28%"
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            tick={{ fontSize: 12, fill: 'var(--color-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-muted)', radius: 6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as ChartEntry
              return (
                <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
                  <p className="font-semibold text-foreground">{d.fullName}</p>
                  <p className="text-muted-foreground">{d.votes.toLocaleString()} votes ({d.pct}%)</p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="pct"
            radius={[0, 6, 6, 0]}
            label={{
              position: 'right',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter: (v: any) => `${v}%`,
              fontSize: 12,
              fill: 'var(--color-muted-foreground)',
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.id}
                fill={
                  entry.id === votedOptionId
                    ? 'var(--color-primary)'
                    : 'var(--color-primary-light)'
                }
                stroke={entry.id === votedOptionId ? 'var(--color-primary-dark)' : 'none'}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground mt-2 text-right">
        {total.toLocaleString()} total vote{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
