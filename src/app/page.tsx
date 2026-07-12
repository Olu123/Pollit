import Link from 'next/link'
import { TrendingUp, Plus, Users, BarChart2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PollCard from '@/components/PollCard'
import HotTakeCard from '@/components/HotTakeCard'
import { T } from '@/components/LanguageProvider'
import type { Poll, PollCategory } from '@/lib/types'
import type { StringKey } from '@/lib/i18n'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export const revalidate = 30

const POLL_SELECT = `
  id, question, category, created_by, expires_at, total_votes, is_hot_take, created_at, image_url,
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
  const [{ data: totalsRows }, { count: userCount }] = await Promise.all([
    supabase.rpc('platform_totals'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])
  const totals = Array.isArray(totalsRows) ? totalsRows[0] : totalsRows

  return {
    pollCount: Number(totals?.poll_count ?? 0),
    voteCount: Number(totals?.vote_count ?? 0),
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

  const [polls, totals, hotTakes] = await Promise.all([getPolls(active), getTotals(), getHotTakes()])

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

      {/* Live stats bar */}
      <div className="grid grid-cols-3 rounded-xl border border-border bg-card shadow-sm divide-x divide-border">
        <Stat icon={<BarChart2 size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.pollCount)} label={<T k="home.statPolls" />} />
        <Stat icon={<TrendingUp size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.voteCount)} label={<T k="home.statVotes" />} />
        <Stat icon={<Users size={15} className="text-primary" strokeWidth={2.5} />} value={fmt(totals.userCount)} label={<T k="home.statUsers" />} />
      </div>

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
