import Link from 'next/link'
import { Flame, TrendingUp, Zap, MessageCircle, LayoutGrid, Users, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { T } from '@/components/LanguageProvider'
import type { StringKey } from '@/lib/i18n'
import type { PollCategory } from '@/lib/types'

export const revalidate = 3600 // refresh hourly

const SITE = 'agora-ng.vercel.app'
const CATEGORIES: PollCategory[] = ['Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle']
const WEEK_MS = 7 * 86_400_000

interface OptionRow { id: string; text: string; vote_count: number; display_order: number }
interface PulsePoll {
  id: string
  question: string
  category: PollCategory
  total_votes: number
  created_by: string | null
  username: string | null
  options: OptionRow[]
  commentCount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function one(rel: any) {
  return Array.isArray(rel) ? rel[0] : rel
}

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function topOptions(p: PulsePoll) {
  const total = p.options.reduce((s, o) => s + o.vote_count, 0) || p.total_votes
  const sorted = [...p.options].sort((a, b) => b.vote_count - a.vote_count)
  return sorted.map((o) => ({ ...o, pct: total > 0 ? Math.round((o.vote_count / total) * 100) : 0 }))
}

const CATEGORY_STYLES: Record<string, string> = {
  Politics: 'bg-red-100 text-red-700',
  Sports: 'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business: 'bg-amber-100 text-amber-700',
  Lifestyle: 'bg-pink-100 text-pink-700',
}

async function getPulse() {
  const weekStartIso = new Date(Date.now() - WEEK_MS).toISOString()

  const [pollsRes, commentRows, { count: votesThisWeek }, { count: newUsers }, voterRows] =
    await Promise.all([
      supabase
        .from('polls')
        .select('id, question, category, total_votes, created_by, profile:profiles!created_by ( username ), options:poll_options ( id, text, vote_count, display_order )')
        .eq('is_community', false)
        .gte('created_at', weekStartIso)
        .order('total_votes', { ascending: false })
        .limit(100),
      supabase.from('votes').select('poll_id').not('comment', 'is', null).gte('created_at', weekStartIso).limit(3000),
      supabase.from('votes').select('id', { count: 'exact', head: true }).gte('created_at', weekStartIso),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekStartIso),
      supabase.from('votes').select('user_id, profile:profiles!user_id ( username )').gte('created_at', weekStartIso).limit(3000),
    ])

  // Comment tally per poll
  const commentTally = new Map<string, number>()
  ;(commentRows.data ?? []).forEach((r) => commentTally.set(r.poll_id, (commentTally.get(r.poll_id) ?? 0) + 1))

  const polls: PulsePoll[] = (pollsRes.data ?? []).map((p) => ({
    id: p.id,
    question: p.question,
    category: p.category as PollCategory,
    total_votes: p.total_votes,
    created_by: p.created_by,
    username: one(p.profile)?.username ?? null,
    options: (p.options ?? []) as OptionRow[],
    commentCount: commentTally.get(p.id) ?? 0,
  }))

  // Most active voter this week
  const voterTally = new Map<string, number>()
  const voterName = new Map<string, string | null>()
  ;(voterRows.data ?? []).forEach((r) => {
    voterTally.set(r.user_id, (voterTally.get(r.user_id) ?? 0) + 1)
    voterName.set(r.user_id, one(r.profile)?.username ?? null)
  })
  let topVoter: { username: string | null; count: number } | null = null
  for (const [uid, count] of voterTally) {
    if (!topVoter || count > topVoter.count) topVoter = { username: voterName.get(uid) ?? null, count }
  }

  // Most popular creator this week (by votes earned on their polls)
  const creatorTally = new Map<string, { username: string | null; votes: number }>()
  for (const p of polls) {
    if (!p.created_by) continue
    const cur = creatorTally.get(p.created_by) ?? { username: p.username, votes: 0 }
    cur.votes += p.total_votes
    creatorTally.set(p.created_by, cur)
  }
  let topCreator: { username: string | null; votes: number } | null = null
  for (const v of creatorTally.values()) {
    if (!topCreator || v.votes > topCreator.votes) topCreator = v
  }

  const trending = [...polls].sort((a, b) => b.total_votes - a.total_votes)
  const mostVoted = trending[0] ?? null

  const upsets = polls
    .filter((p) => p.options.length >= 2 && p.total_votes > 0)
    .map((p) => {
      const t = topOptions(p)
      return { poll: p, margin: t[0].pct - t[1].pct, top: t.slice(0, 2) }
    })
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5)

  const mostDiscussed = polls.filter((p) => p.commentCount > 0).sort((a, b) => b.commentCount - a.commentCount).slice(0, 5)

  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    poll: trending.find((p) => p.category === cat) ?? null,
  })).filter((c) => c.poll)

  return {
    mostVoted,
    trending: trending.slice(0, 5),
    upsets,
    mostDiscussed,
    byCategory,
    stats: {
      votesThisWeek: votesThisWeek ?? 0,
      newUsers: newUsers ?? 0,
      topVoter,
      topCreator,
    },
    hasData: polls.length > 0,
  }
}

function weekRange() {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const end = new Date()
  const start = new Date(Date.now() - WEEK_MS)
  return `${start.toLocaleDateString('en-NG', opts)} – ${end.toLocaleDateString('en-NG', { ...opts, year: 'numeric' })}`
}

export default async function PulsePage() {
  const data = await getPulse()
  const range = weekRange()
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`🇳🇬 The Nigerian Pulse this week (${range}) — see what Nigeria is voting on: https://${SITE}/pulse`)}`

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
      {/* Header */}
      <header className="text-center flex flex-col items-center gap-1.5">
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          <T k="pulse.title" />
        </h1>
        <p className="text-sm text-muted-foreground"><T k="pulse.subtitle" /></p>
        <span className="text-xs font-semibold bg-primary-light text-primary px-3 py-1 rounded-full mt-1">
          {range}
        </span>
      </header>

      {!data.hasData ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center">
            <Flame size={36} className="text-primary" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground"><T k="pulse.emptyTitle" /></p>
            <p className="text-sm text-muted-foreground mt-1"><T k="pulse.emptySub" /></p>
          </div>
          <Link href="/create" className="inline-flex items-center bg-primary text-white text-sm font-semibold px-6 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all">
            Create a Poll
          </Link>
        </div>
      ) : (
        <>
          {/* 1. Most voted */}
          {data.mostVoted && (
            <Section icon={<Flame size={18} className="text-[#DC2626]" />} title={<T k="pulse.mostVoted" />}>
              <Link
                href={`/polls/${data.mostVoted.id}`}
                className="block bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex-col gap-4"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[data.mostVoted.category]}`}>
                    {data.mostVoted.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-primary-light text-primary text-xs font-bold px-3 py-1.5 rounded-full">
                    <Users size={13} strokeWidth={2.5} /> {fmt(data.mostVoted.total_votes)} votes
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg leading-snug mb-4">{data.mostVoted.question}</h3>
                <div className="flex flex-col gap-3">
                  {topOptions(data.mostVoted).map((o) => (
                    <div key={o.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground/80">{o.text}</span>
                        <span className="font-bold tabular-nums">{o.pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary animate-bar" style={{ width: `${o.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            </Section>
          )}

          {/* 2. Trending top 5 */}
          <Section icon={<TrendingUp size={18} className="text-primary" />} title={<T k="pulse.trending" />}>
            <div className="flex flex-col gap-2">
              {data.trending.map((p, i) => {
                const top = topOptions(p)[0]
                return (
                  <Link key={p.id} href={`/polls/${p.id}`} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.question}</p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                        <div className="h-full rounded-full bg-primary animate-bar" style={{ width: `${top?.pct ?? 0}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">{fmt(p.total_votes)}</span>
                  </Link>
                )
              })}
            </div>
          </Section>

          {/* 3. Biggest upsets (closest races) */}
          {data.upsets.length > 0 && (
            <Section icon={<Zap size={18} className="text-amber-500" />} title={<T k="pulse.upsets" />} subtitle={<T k="pulse.upsetsSub" />}>
              <div className="flex flex-col gap-2">
                {data.upsets.map(({ poll, top, margin }) => (
                  <Link key={poll.id} href={`/polls/${poll.id}`} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all p-4">
                    <p className="text-sm font-semibold text-foreground truncate mb-1">{poll.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {top[0].text} <span className="font-bold text-foreground">{top[0].pct}%</span> vs {top[1].text}{' '}
                      <span className="font-bold text-foreground">{top[1].pct}%</span>
                      <span className="ml-1 text-amber-600 font-semibold">· {margin}% margin</span>
                    </p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 4. Most discussed */}
          {data.mostDiscussed.length > 0 && (
            <Section icon={<MessageCircle size={18} className="text-violet-500" />} title={<T k="pulse.discussed" />}>
              <div className="flex flex-col gap-2">
                {data.mostDiscussed.map((p) => (
                  <Link key={p.id} href={`/polls/${p.id}`} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.question}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 shrink-0">
                      <MessageCircle size={12} strokeWidth={2.5} /> {p.commentCount}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 5. By category */}
          <Section icon={<LayoutGrid size={18} className="text-blue-500" />} title={<T k="pulse.byCategory" />}>
            <div className="flex flex-col gap-2">
              {data.byCategory.map(({ category, poll }) => poll && (
                <Link key={category} href={`/polls/${poll.id}`} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all p-4 flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${CATEGORY_STYLES[category]}`}>{category}</span>
                  <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{poll.question}</p>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">{fmt(poll.total_votes)}</span>
                </Link>
              ))}
            </div>
          </Section>

          {/* 6. Community stats */}
          <Section icon={<Users size={18} className="text-primary" />} title={<T k="pulse.community" />}>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label={<T k="pulse.newUsers" />} value={fmt(data.stats.newUsers)} />
              <StatBox label={<T k="pulse.votesWeek" />} value={fmt(data.stats.votesThisWeek)} />
              <StatBox
                label={<T k="pulse.topVoter" />}
                value={data.stats.topVoter?.username ? `@${data.stats.topVoter.username}` : '—'}
                sub={data.stats.topVoter ? `${fmt(data.stats.topVoter.count)} votes` : undefined}
                icon={<Trophy size={13} className="text-amber-500" />}
              />
              <StatBox
                label={<T k="pulse.topCreator" />}
                value={data.stats.topCreator?.username ? `@${data.stats.topCreator.username}` : '—'}
                sub={data.stats.topCreator ? `${fmt(data.stats.topCreator.votes)} votes earned` : undefined}
                icon={<Trophy size={13} className="text-amber-500" />}
              />
            </div>
          </Section>

          {/* Weekly share */}
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:brightness-95 active:scale-[0.98] transition-all"
          >
            <T k="pulse.share" />
          </a>
        </>
      )}
    </main>
  )
}

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-black text-foreground">{title}</h2>
      </div>
      {subtitle && <p className="-mt-2 text-xs text-muted-foreground">{subtitle}</p>}
      {children}
    </section>
  )
}

function StatBox({ label, value, sub, icon }: { label: React.ReactNode; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-black text-foreground truncate flex items-center gap-1">{icon}{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}
