import Link from 'next/link'
import { TrendingUp, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PollCard from '@/components/PollCard'
import type { Poll, PollCategory } from '@/lib/types'

export const revalidate = 30

const CATEGORIES = [
  'All', 'Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle',
] as const
type CategoryFilter = (typeof CATEGORIES)[number]

async function getPolls(category: CategoryFilter): Promise<Poll[]> {
  let query = supabase
    .from('polls')
    .select(`
      id, question, category, created_by, expires_at, total_votes, created_at,
      profile:profiles!created_by ( id, username, full_name, avatar_url, points, created_at, updated_at ),
      options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
    `)
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

async function getTotals(): Promise<{ pollCount: number; voteCount: number }> {
  const { data } = await supabase
    .from('polls')
    .select('total_votes')
    .limit(1000)

  if (!data) return { pollCount: 0, voteCount: 0 }
  return {
    pollCount: data.length,
    voteCount: data.reduce((s, p) => s + (p.total_votes ?? 0), 0),
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const active: CategoryFilter =
    CATEGORIES.includes(category as CategoryFilter) ? (category as CategoryFilter) : 'All'

  const [polls, totals] = await Promise.all([getPolls(active), getTotals()])

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      {/* Hero */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
            <span className="text-primary">Nigeria:</span> Have your say. Pave the way. Save the day.
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg">
            Join thousands of Nigerians sharing opinions on politics, sports, entertainment and everyday life.
          </p>
          <div className="mt-4 flex items-center gap-5 text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-primary" strokeWidth={2.5} />
              <span className="font-semibold text-foreground">{totals.pollCount}</span>
              <span className="text-muted-foreground">active polls</span>
            </div>
            {totals.voteCount > 0 && (
              <>
                <div className="w-px h-4 bg-border" />
                <div>
                  <span className="font-semibold text-foreground">
                    {totals.voteCount >= 1000
                      ? `${(totals.voteCount / 1000).toFixed(1)}k`
                      : totals.voteCount}
                  </span>{' '}
                  <span className="text-muted-foreground">total votes</span>
                </div>
              </>
            )}
          </div>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3 rounded-full hover:bg-primary-dark transition-colors self-start sm:self-auto shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create Poll
        </Link>
      </section>

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
              className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-border'
              }`}
            >
              {cat}
            </Link>
          )
        })}
      </div>

      {/* Grid */}
      {polls.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="font-bold text-lg text-foreground">
            {active === 'All' ? 'No polls yet' : `No polls in ${active} yet`}
          </p>
          <p className="text-sm text-muted-foreground">Be the first to start the conversation.</p>
          <Link
            href="/create"
            className="mt-2 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
          >
            Create a Poll
          </Link>
        </div>
      )}
    </main>
  )
}
