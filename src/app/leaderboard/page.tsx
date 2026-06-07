import Link from 'next/link'
import { Star, BarChart2, CheckSquare, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { T } from '@/components/LanguageProvider'
import type { StringKey } from '@/lib/i18n'

export const revalidate = 300 // re-fetch at most every 5 minutes

// ── Types ─────────────────────────────────────────────────────

type TabKey = 'overall' | 'voters' | 'creators'

interface LeaderboardEntry {
  id: string
  username: string | null
  points: number
  votes_cast: number
  polls_created: number
}

// ── Helpers ───────────────────────────────────────────────────

const TABS = [
  { key: 'overall'  as TabKey, labelKey: 'lb.overall'     as StringKey, icon: Star,        hintKey: 'lb.hintOverall'  as StringKey },
  { key: 'voters'   as TabKey, labelKey: 'lb.topVoters'   as StringKey, icon: CheckSquare, hintKey: 'lb.hintVoters'   as StringKey },
  { key: 'creators' as TabKey, labelKey: 'lb.topCreators' as StringKey, icon: BarChart2,   hintKey: 'lb.hintCreators' as StringKey },
] as const

const AVATAR_PALETTE = [
  '#16a34a','#2563eb','#7c3aed','#dc2626',
  '#ea580c','#0891b2','#be185d','#0d9488',
]

function avatarColor(id: string): string {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function getInitials(username: string | null): string {
  if (!username) return '?'
  return username.slice(0, 2).toUpperCase()
}

function sortEntries(entries: LeaderboardEntry[], tab: TabKey): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (tab === 'voters')   return b.votes_cast    - a.votes_cast    || b.points - a.points
    if (tab === 'creators') return b.polls_created - a.polls_created || b.points - a.points
    return b.points - a.points
  })
}

function fmtNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

// ── Data fetching ─────────────────────────────────────────────

async function getLeaderboardData(): Promise<LeaderboardEntry[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, points')
    .gt('points', 0)
    .order('points', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[Leaderboard] profiles fetch:', error.message)
    return []
  }
  if (!profiles?.length) return []

  const ids = profiles.map((p) => p.id)

  const [{ data: voteRows }, { data: pollRows }] = await Promise.all([
    supabase.from('votes').select('user_id').in('user_id', ids),
    supabase.from('polls').select('created_by').in('created_by', ids).not('created_by', 'is', null).is('deleted_at', null),
  ])

  const votesMap = new Map<string, number>()
  const pollsMap = new Map<string, number>()
  voteRows?.forEach(({ user_id }) =>
    votesMap.set(user_id, (votesMap.get(user_id) ?? 0) + 1)
  )
  pollRows?.forEach(({ created_by }) => {
    if (created_by) pollsMap.set(created_by, (pollsMap.get(created_by) ?? 0) + 1)
  })

  return profiles.map((p) => ({
    ...p,
    votes_cast:    votesMap.get(p.id) ?? 0,
    polls_created: pollsMap.get(p.id) ?? 0,
  }))
}

// ── Page ──────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab = 'overall' } = await searchParams
  const tab: TabKey = (['overall', 'voters', 'creators'] as const).includes(rawTab as TabKey)
    ? (rawTab as TabKey)
    : 'overall'

  const entries = await getLeaderboardData()
  const sorted  = sortEntries(entries, tab)

  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Trophy size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none">
            <T k="lb.title" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <T k={activeTab.hintKey} /> · {sorted.length} <T k="lb.rankedUsers" />
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5">
        {TABS.map(({ key, labelKey, icon: Icon }) => {
          const isActive = key === tab
          return (
            <Link
              key={key}
              href={`/leaderboard?tab=${key}`}
              className={`shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 min-h-[44px] rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-border'
              }`}
            >
              <Icon size={13} strokeWidth={2.5} />
              <T k={labelKey} />
            </Link>
          )
        })}
      </div>

      {/* Board */}
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry, i) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              rank={i + 1}
              tab={tab}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground pt-2">
        Earn <span className="text-primary font-semibold">+5 tokens</span> per vote ·{' '}
        <span className="text-primary font-semibold">+20 tokens</span> per poll created
      </p>
    </main>
  )
}

// ── Row ───────────────────────────────────────────────────────

const MEDAL = ['🥇', '🥈', '🥉']

const RANK_BORDER: Record<number, string> = {
  1: 'border-l-[3px] border-l-yellow-400',
  2: 'border-l-[3px] border-l-zinc-400',
  3: 'border-l-[3px] border-l-amber-600',
}

function LeaderboardRow({
  entry, rank, tab,
}: {
  entry: LeaderboardEntry
  rank: number
  tab: TabKey
}) {
  const medal      = rank <= 3 ? MEDAL[rank - 1] : null
  const accentBorder = RANK_BORDER[rank] ?? ''
  const displayName = entry.username ? `@${entry.username}` : 'Anonymous'
  const bg          = avatarColor(entry.id)
  const initials    = getInitials(entry.username)

  return (
    <div
      className={`bg-card border rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-shadow hover:shadow-sm ${accentBorder}`}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center shrink-0">
        {medal ? (
          <span className="text-xl leading-none">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-muted-foreground tabular-nums">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 select-none"
        style={{ backgroundColor: bg }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Name + stats */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm truncate leading-tight">
          {displayName}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${tab === 'voters' ? 'text-primary font-semibold' : ''}`}>
            <CheckSquare size={11} strokeWidth={2} />
            {fmtNum(entry.votes_cast)} <T k="lb.votes" />
          </span>
          <span className={`flex items-center gap-1 ${tab === 'creators' ? 'text-primary font-semibold' : ''}`}>
            <BarChart2 size={11} strokeWidth={2} />
            {fmtNum(entry.polls_created)} <T k="lb.polls" />
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <div className={`flex items-center gap-1 font-bold tabular-nums ${tab === 'overall' ? 'text-primary' : 'text-foreground'}`}>
          <Star size={12} strokeWidth={2.5} className={tab === 'overall' ? 'text-primary' : 'text-muted-foreground'} />
          <span className="text-sm">{fmtNum(entry.points)}</span>
        </div>
        <span className="text-[10px] text-muted-foreground"><T k="lb.tokens" /></span>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Trophy size={28} className="text-muted-foreground" />
      </div>
      <div>
        <p className="font-bold text-foreground"><T k="lb.emptyTitle" /></p>
        <p className="text-sm text-muted-foreground mt-1">
          <T k="lb.emptySub" />
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center bg-primary text-white text-sm font-semibold px-6 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all"
      >
        <T k="lb.browse" />
      </Link>
    </div>
  )
}
