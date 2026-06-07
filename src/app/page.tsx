import Link from 'next/link'
import { TrendingUp, Plus, Users, BarChart2, Trophy, Clock, Coins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PollCard from '@/components/PollCard'
import HotTakeCard from '@/components/HotTakeCard'
import { T } from '@/components/LanguageProvider'
import type { Poll, PollCategory } from '@/lib/types'
import type { StringKey } from '@/lib/i18n'

export const revalidate = 30

const POLL_SELECT = `
  id, question, category, created_by, expires_at, total_votes, is_hot_take, created_at,
  profile:profiles!created_by ( id, username, avatar_url ),
  options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
`

const CATEGORIES = [
  'All', 'Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle',
] as const
type CategoryFilter = (typeof CATEGORIES)[number]

async function getPolls(category: CategoryFilter): Promise<Poll[]> {
  let query = supabase
    .from('polls')
    .select(POLL_SELECT)
    .eq('is_community', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(30)

  if (category !== 'All') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) {
    console.error('Polls fetch error:', error.message)
    return []
  }
  return (data ?? []) as unknown as Poll[]
}

async function getActiveChallenges(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(`
      id, question, category, created_by, expires_at, total_votes,
      is_challenge, challenge_pool, challenge_status,
      options:poll_options ( id, vote_count )
    `)
    .eq('is_challenge', true)
    .eq('challenge_status', 'active')
    .is('deleted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return []
  return (data ?? []) as unknown as Poll[]
}

async function getHotTakes(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_SELECT)
    .eq('is_hot_take', true)
    .eq('is_community', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return []
  return (data ?? []) as unknown as Poll[]
}

async function getTotals(): Promise<{ pollCount: number; voteCount: number; userCount: number }> {
  const [{ data: polls }, { count: userCount }] = await Promise.all([
    supabase.from('polls').select('total_votes').is('deleted_at', null).limit(1000),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  return {
    pollCount: polls?.length ?? 0,
    voteCount: (polls ?? []).reduce((s, p) => s + (p.total_votes ?? 0), 0),
    userCount: userCount ?? 0,
  }
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active: CategoryFilter =
    CATEGORIES.includes(category as CategoryFilter) ? (category as CategoryFilter) : 'All'

  const [polls, totals, hotTakes, challenges] = await Promise.all([
    getPolls(active), getTotals(), getHotTakes(), getActiveChallenges(),
  ])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
      {/* Hero */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              <T k="home.heroHighlight" />
            </span>{' '}
            <span className="text-foreground"><T k="home.heroRest" /></span>
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg">
            <T k="home.heroSubtitle" />
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm px-6 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all self-start sm:self-auto shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          <T k="nav.create" />
        </Link>
      </section>

      {/* Token transparency trust badge */}
      <Link
        href="/transparency"
        className="group flex items-center justify-between gap-3 rounded-xl bg-muted/60 hover:bg-muted px-4 py-2.5 transition-colors -mt-2"
      >
        <span className="text-xs sm:text-sm text-muted-foreground">
          <T k="home.transparency" />
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
          <T k="home.transparencyView" />
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </Link>

      {/* Live stats bar */}
      <div className="grid grid-cols-3 rounded-xl border border-border bg-card shadow-sm divide-x divide-border">
        <Stat icon={<BarChart2 size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.pollCount)} label={<T k="home.statPolls" />} />
        <Stat icon={<TrendingUp size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.voteCount)} label={<T k="home.statVotes" />} />
        <Stat icon={<Users size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.userCount)} label={<T k="home.statUsers" />} />
      </div>

      {/* 🏆 Active Challenges row */}
      {challenges.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <T k="home.challenges" />
            </h2>
            <Link href="/challenges" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
              <T k="challenge.view" /> →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {challenges.map((poll) => (
              <HomeChallengeCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}

      {/* 🔥 Hot Takes row */}
      {hotTakes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <T k="home.hotTakes" />
          </h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {hotTakes.map((poll) => (
              <HotTakeCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Filter polls by category"
        className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat
          const href = cat === 'All' ? '/' : `/?category=${cat}`
          return (
            <Link
              key={cat}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={`shrink-0 flex items-center text-sm font-semibold px-4 min-h-[44px] rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-border'
              }`}
            >
              <T k={`cat.${cat}` as StringKey} />
            </Link>
          )
        })}
      </div>

      {/* Grid */}
      {polls.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {polls.map((poll, i) => (
            <PollCard key={poll.id} poll={poll} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center">
            <BarChart2 size={36} className="text-primary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground">
              <T k={active === 'All' ? 'home.emptyTitle' : 'home.emptyTitleCat'} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <T k="home.emptySub" />
            </p>
          </div>
          <Link
            href="/create"
            className="mt-1 inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            <T k="home.emptyCta" />
          </Link>
        </div>
      )}
    </main>
  )
}

function timeLeftShort(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  if (d > 0) return `${d}d ${h}h`
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function HomeChallengeCard({ poll }: { poll: Poll }) {
  return (
    <Link
      href={`/polls/${poll.id}`}
      className="snap-start shrink-0 w-72 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">
          <Trophy size={12} strokeWidth={2.5} /> <T k="challenge.badge" />
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
          <Clock size={11} strokeWidth={2.5} />{timeLeftShort(poll.expires_at)}
        </span>
      </div>
      <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-2 min-h-[40px]">{poll.question}</h3>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-amber-200">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Coins size={13} strokeWidth={2.5} />
          {poll.challenge_pool.toLocaleString()} <T k="challenge.tokens" />
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Users size={12} strokeWidth={2.5} />{poll.total_votes.toLocaleString()}
        </span>
      </div>
    </Link>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 text-center">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-black text-foreground tabular-nums leading-none">{value}</span>
      </div>
      <span className="text-[11px] sm:text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
