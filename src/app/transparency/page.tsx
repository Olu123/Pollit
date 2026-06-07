'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Loader2, Search, ChevronLeft, ChevronRight, Download, Link as LinkIcon, Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'
import ViewTracker from '@/components/ViewTracker'
import { SITE_URL } from '@/lib/site'
import { TOTAL_SUPPLY, type TokenTransaction } from '@/lib/transparency'

const PAGE_SIZE = 50

const TYPE_META: Record<string, { label: string; emoji: string; badge: string; color: string }> = {
  vote:             { label: 'Voting rewards',     emoji: '🗳️', badge: 'bg-blue-100 text-blue-700',     color: '#2563eb' },
  poll_created:     { label: 'Poll creation',      emoji: '📊', badge: 'bg-green-100 text-green-700',   color: '#16a34a' },
  challenge:        { label: 'Challenge payouts',  emoji: '🏆', badge: 'bg-amber-100 text-amber-700',   color: '#f59e0b' },
  referral:         { label: 'Referral rewards',   emoji: '👥', badge: 'bg-purple-100 text-purple-700', color: '#7c3aed' },
  admin_adjustment: { label: 'Admin adjustments',  emoji: '⚙️', badge: 'bg-gray-100 text-gray-600',     color: '#6b7280' },
  signup:           { label: 'Signup bonus',       emoji: '🎁', badge: 'bg-pink-100 text-pink-700',     color: '#db2777' },
}

function typeMeta(t: string) {
  return TYPE_META[t] ?? { label: t, emoji: '•', badge: 'bg-muted text-muted-foreground', color: '#94a3b8' }
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

interface Supply { distributed: number; circulating: number }
interface DailyPoint { date: string; tokens: number }
interface TypeSlice { reason_type: string; total: number }
interface ChallengeRow {
  id: string; question: string; challenge_pool: number; total_votes: number
  challenge_status: string; challenge_distributed: boolean; challenge_distributed_at: string | null
}

export default function TransparencyPage() {
  const { lang } = useLanguage()
  const en = lang === 'en'

  const [loading, setLoading]   = useState(true)
  const [supply, setSupply]     = useState<Supply>({ distributed: 0, circulating: 0 })
  const [stats, setStats]       = useState({ users: 0, transactions: 0, votes: 0, polls: 0 })
  const [daily, setDaily]       = useState<DailyPoint[]>([])
  const [byType, setByType]     = useState<TypeSlice[]>([])
  const [challenges, setChallenges] = useState<ChallengeRow[]>([])

  // Live feed (paginated + filtered)
  const [feed, setFeed]         = useState<TokenTransaction[]>([])
  const [feedTotal, setFeedTotal] = useState(0)
  const [page, setPage]         = useState(0)
  const [filterType, setFilterType] = useState<string>('all')
  const [search, setSearch]     = useState('')
  const [feedLoading, setFeedLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // ── Top-level aggregates ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      const since = new Date(Date.now() - 30 * 86_400_000)
      const [
        { data: supplyRows },
        { count: users },
        { count: transactions },
        { count: votes },
        { count: polls },
        { data: dailyRows },
        { data: typeRows },
        { data: challengeRows },
      ] = await Promise.all([
        supabase.rpc('transparency_supply'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('token_transactions').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('polls').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.rpc('transparency_daily', { p_days: 30 }),
        supabase.rpc('transparency_by_type'),
        supabase.from('polls')
          .select('id, question, challenge_pool, total_votes, challenge_status, challenge_distributed, challenge_distributed_at')
          .eq('is_challenge', true).is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ])

      const s = Array.isArray(supplyRows) ? supplyRows[0] : supplyRows
      setSupply({ distributed: Number(s?.distributed ?? 0), circulating: Number(s?.circulating ?? 0) })
      setStats({ users: users ?? 0, transactions: transactions ?? 0, votes: votes ?? 0, polls: polls ?? 0 })

      // Build a continuous 30-day axis so the chart has no gaps.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byDate = new Map<string, number>((dailyRows ?? []).map((r: any) => [r.date, Number(r.tokens_distributed)]))
      const series: DailyPoint[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(since.getTime() + (29 - i) * 86_400_000)
        const key = d.toISOString().slice(0, 10)
        series.push({
          date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          tokens: byDate.get(key) ?? 0,
        })
      }
      setDaily(series)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setByType((typeRows ?? []).map((r: any) => ({ reason_type: r.reason_type, total: Number(r.total) })))
      setChallenges((challengeRows ?? []) as ChallengeRow[])
      setLoading(false)
    }
    load()
  }, [])

  // ── Live feed (refetch on page / filter / search) ────────────
  const loadFeed = useCallback(async () => {
    setFeedLoading(true)
    let q = supabase
      .from('token_transactions')
      .select('id, user_id, username, amount, reason, reason_type, poll_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (filterType !== 'all') q = q.eq('reason_type', filterType)
    if (search.trim()) q = q.ilike('username', `%${search.trim()}%`)
    const from = page * PAGE_SIZE
    const { data, count } = await q.range(from, from + PAGE_SIZE - 1)
    setFeed((data ?? []) as TokenTransaction[])
    setFeedTotal(count ?? 0)
    setFeedLoading(false)
  }, [page, filterType, search])

  useEffect(() => { loadFeed() }, [loadFeed])

  async function downloadCsv() {
    setDownloading(true)
    const { data } = await supabase
      .from('token_transactions')
      .select('id, created_at, username, reason_type, amount, reason')
      .order('created_at', { ascending: false })
      .limit(10000)
    const rows = data ?? []
    const header = ['id', 'created_at', 'username', 'reason_type', 'amount', 'reason']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv = [header.join(','), ...rows.map((r: any) => header.map((h) => esc(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pollit-token-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  const distributed = supply.distributed
  const reserve = TOTAL_SUPPLY - distributed
  const pctDistributed = (distributed / TOTAL_SUPPLY) * 100
  const pctReserve = (reserve / TOTAL_SUPPLY) * 100

  if (loading) {
    return (
      <main className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </main>
    )
  }

  const totalPages = Math.max(1, Math.ceil(feedTotal / PAGE_SIZE))
  const rangeStart = feedTotal === 0 ? 0 : page * PAGE_SIZE + 1
  const rangeEnd = Math.min(feedTotal, (page + 1) * PAGE_SIZE)

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8 sm:gap-10">
      <ViewTracker event="transparency" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">🔍 {en ? 'Token Transparency' : 'Token Transparency'}</h1>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-[#DC2626] border border-red-200">
            <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" /> {en ? 'Live Data' : 'Live Data'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {en
            ? 'Every token ever created, distributed and held in reserve — visible to all.'
            : 'Every token wey don ever exist — e dey here for everybody to see.'}
        </p>
      </header>

      {/* ── Section 1: Supply Overview ─────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SupplyCard
          tone="amber" label={en ? '🟡 Total Supply' : '🟡 Total Supply'}
          value={fmt(TOTAL_SUPPLY)}
          sub={en ? 'Maximum tokens that will ever exist' : 'Maximum tokens wey go ever exist'}
        />
        <SupplyCard
          tone="green" label={en ? '🟢 Distributed' : '🟢 Distributed'}
          value={`${fmt(distributed)}`}
          sub={`${pctDistributed.toFixed(2)}% ${en ? 'of total supply' : 'of total supply'}`}
          bar={pctDistributed} barColor="#16a34a"
        />
        <SupplyCard
          tone="blue" label={en ? '🔵 Circulating' : '🔵 Circulating'}
          value={fmt(supply.circulating)}
          sub={en ? "In users' wallets right now" : 'For people wallet right now'}
        />
        <SupplyCard
          tone="gray" label={en ? '⚫ Reserve' : '⚫ Reserve'}
          value={fmt(reserve)}
          sub={`${pctReserve.toFixed(2)}% ${en ? 'held in reserve' : 'dey reserve'}`}
        />
      </section>

      {/* Quick stats strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border bg-card shadow-sm divide-x divide-y sm:divide-y-0 divide-border">
        <MiniStat value={fmt(stats.users)}        label={en ? 'Users' : 'Users'} />
        <MiniStat value={fmt(stats.transactions)} label={en ? 'Transactions' : 'Transactions'} />
        <MiniStat value={fmt(stats.votes)}        label={en ? 'Votes' : 'Votes'} />
        <MiniStat value={fmt(stats.polls)}        label={en ? 'Polls' : 'Polls'} />
      </section>

      {/* ── Section 2: Token Flow Chart ────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-black text-foreground mb-1">{en ? 'Token Distribution Over Time' : 'Token Distribution Over Time'}</h2>
        <p className="text-xs text-muted-foreground mb-4">{en ? 'Daily tokens distributed — last 30 days' : 'Tokens wey dem share each day — last 30 days'}</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={daily} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} width={48} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
            <Tooltip formatter={(v) => [`${fmt(Number(v))} tokens`, 'Distributed']} />
            <Area type="monotone" dataKey="tokens" stroke="#16a34a" strokeWidth={2} fill="url(#tokenFlow)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ── Section 3: Distribution Breakdown ──────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-black text-foreground mb-4">{en ? 'Distribution Breakdown' : 'How Dem Share Am'}</h2>
        {byType.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{en ? 'No transactions yet.' : 'No transaction yet.'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byType} dataKey="total" nameKey="reason_type"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}
                >
                  {byType.map((s) => <Cell key={s.reason_type} fill={typeMeta(s.reason_type).color} />)}
                </Pie>
                <Tooltip formatter={(v, _n, p) => [`${fmt(Number(v))} tokens`, typeMeta(String(p?.payload?.reason_type)).label]} />
                <Legend formatter={(val) => typeMeta(String(val)).label} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {byType.map((s) => {
                const m = typeMeta(s.reason_type)
                const total = byType.reduce((a, b) => a + b.total, 0) || 1
                return (
                  <div key={s.reason_type} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-foreground/80 flex-1">{m.emoji} {m.label}</span>
                    <span className="font-bold tabular-nums text-foreground">{fmt(s.total)}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">{Math.round((s.total / total) * 100)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Section 4: Live Transaction Feed ───────────────────── */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">📋 {en ? 'Public Token Ledger' : 'Public Token Ledger'}</h2>
          <p className="text-xs text-muted-foreground">{en ? 'Every transaction. Nothing hidden.' : 'Every transaction. Nothing hide.'}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder={en ? 'Search by username…' : 'Find by username…'}
              className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">{en ? 'All types' : 'All types'}</option>
            {Object.keys(TYPE_META).map((t) => (
              <option key={t} value={t}>{typeMeta(t).emoji} {typeMeta(t).label}</option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4 font-semibold">{en ? 'Date' : 'Date'}</th>
                  <th className="text-left py-2.5 px-4 font-semibold">{en ? 'User' : 'User'}</th>
                  <th className="text-left py-2.5 px-4 font-semibold">{en ? 'Type' : 'Type'}</th>
                  <th className="text-right py-2.5 px-4 font-semibold">{en ? 'Amount' : 'Amount'}</th>
                  <th className="text-left py-2.5 px-4 font-semibold hidden md:table-cell">{en ? 'Reason' : 'Reason'}</th>
                </tr>
              </thead>
              <tbody>
                {feedLoading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 size={20} className="animate-spin text-primary inline" /></td></tr>
                ) : feed.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">{en ? 'No transactions found.' : 'No transaction dey.'}</td></tr>
                ) : feed.map((tx) => {
                  const m = typeMeta(tx.reason_type)
                  return (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap text-xs">{fmtDateTime(tx.created_at)}</td>
                      <td className="py-2.5 px-4 text-foreground">{tx.username ? `@${tx.username}` : <span className="text-muted-foreground italic">Anonymous</span>}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badge}`}>{m.emoji} {m.label}</span>
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? `+${fmt(tx.amount)}` : fmt(tx.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground hidden md:table-cell max-w-[260px] truncate">{tx.reason}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {en ? 'Showing' : 'Showing'} {fmt(rangeStart)}–{fmt(rangeEnd)} {en ? 'of' : 'of'} {fmt(feedTotal)} {en ? 'transactions' : 'transactions'}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || feedLoading}
              className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-border disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={15} /> {en ? 'Prev' : 'Prev'}
            </button>
            <span className="text-xs text-muted-foreground tabular-nums px-1">{page + 1}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || feedLoading}
              className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-border disabled:opacity-40 transition-colors"
            >
              {en ? 'Next' : 'Next'} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Section 5: Challenge History ───────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-foreground">🏆 {en ? 'Challenge Transparency' : 'Challenge Transparency'}</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4 font-semibold">{en ? 'Challenge' : 'Challenge'}</th>
                  <th className="text-right py-2.5 px-4 font-semibold">{en ? 'Pool' : 'Pool'}</th>
                  <th className="text-right py-2.5 px-4 font-semibold">{en ? 'Players' : 'Players'}</th>
                  <th className="text-right py-2.5 px-4 font-semibold hidden sm:table-cell">{en ? 'Per person' : 'Per person'}</th>
                  <th className="text-left py-2.5 px-4 font-semibold">{en ? 'Status' : 'Status'}</th>
                  <th className="text-left py-2.5 px-4 font-semibold hidden md:table-cell">{en ? 'Distributed' : 'Distributed'}</th>
                </tr>
              </thead>
              <tbody>
                {challenges.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">{en ? 'No challenges yet.' : 'No challenge yet.'}</td></tr>
                ) : challenges.map((c) => {
                  const perPerson = c.total_votes > 0 ? Math.floor(c.challenge_pool / c.total_votes) : 0
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 max-w-[220px]"><Link href={`/polls/${c.id}`} className="text-foreground hover:text-primary line-clamp-1">{c.question}</Link></td>
                      <td className="py-2.5 px-4 text-right font-bold tabular-nums text-amber-600">{fmt(c.challenge_pool)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-foreground">{fmt(c.total_votes)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{c.challenge_distributed ? fmt(perPerson) : '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.challenge_distributed ? 'bg-green-100 text-green-700' : c.challenge_status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.challenge_distributed ? (en ? 'Paid out' : 'Don pay') : c.challenge_status === 'active' ? (en ? 'Active' : 'Dey on') : (en ? 'Completed' : 'Don finish')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
                        {c.challenge_distributed_at ? fmtDateTime(c.challenge_distributed_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 6: Reserve Proof ───────────────────────────── */}
      <section className="bg-gradient-to-br from-muted/60 to-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col gap-3">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2"><Lock size={18} className="text-primary" /> {en ? 'Reserve Integrity' : 'Reserve Integrity'}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {en
            ? 'Pollit started with 100,000,000 tokens. Every token distributed is logged in this public ledger. The reserve is simply:'
            : 'Pollit start with 100,000,000 tokens. Every token wey dem share dey logged for this public ledger. The reserve na just:'}
        </p>
        <div className="bg-card border border-border rounded-xl p-4 font-mono text-sm flex flex-col gap-1.5">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">{en ? 'Total Supply' : 'Total Supply'}</span><span className="font-bold text-foreground tabular-nums">{fmt(TOTAL_SUPPLY)}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">− {en ? 'Distributed' : 'Distributed'}</span><span className="font-bold text-[#DC2626] tabular-nums">{fmt(distributed)}</span></div>
          <div className="border-t border-border my-1" />
          <div className="flex items-center justify-between"><span className="text-foreground font-semibold">= {en ? 'Reserve' : 'Reserve'}</span><span className="font-black text-green-600 tabular-nums">{fmt(reserve)}</span></div>
        </div>
        <p className="text-xs text-muted-foreground">
          {en ? 'You can verify this yourself using our public API: ' : 'You fit verify am yourself with our public API: '}
          <a href="/api/transparency" className="text-primary font-semibold hover:underline">{SITE_URL}/api/transparency</a>
        </p>
      </section>

      {/* ── Section 7: Download + API ──────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={downloadCsv}
          disabled={downloading}
          className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-sm min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
        >
          {downloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
          {en ? 'Download Full Ledger (CSV)' : 'Download Full Ledger (CSV)'}
        </button>
        <a
          href="/api/transparency"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-card border border-border text-foreground font-bold text-sm min-h-[52px] rounded-xl hover:bg-muted active:scale-[0.99] transition-all"
        >
          <LinkIcon size={17} /> {en ? 'Public API' : 'Public API'}
        </a>
      </section>

      {/* Example JSON */}
      <details className="bg-card border border-border rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors">
          {en ? 'Example API response' : 'Example API response'}
        </summary>
        <pre className="px-4 py-3 text-xs text-muted-foreground overflow-x-auto border-t border-border bg-muted/20">{`GET /api/transparency

{
  "supply": {
    "total": 100000000,
    "distributed": ${distributed},
    "circulating": ${supply.circulating},
    "remaining_reserve": ${reserve},
    "percent_distributed": ${pctDistributed.toFixed(4)}
  },
  "stats": { "total_users": ${stats.users}, "total_transactions": ${stats.transactions}, ... },
  "recent_transactions": [ ... ],
  "generated_at": "${new Date().toISOString()}"
}`}</pre>
      </details>

      {/* ── Footer note ────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
        {en
          ? 'This data updates every 60 seconds. Pollit is committed to full transparency in its token economy. All transactions are permanent and cannot be deleted or modified.'
          : 'This data dey update every 60 seconds. Pollit promise say everything go dey open for everybody to see.'}
      </p>
    </main>
  )
}

// ── Presentational helpers ──────────────────────────────────────

function SupplyCard({
  tone, label, value, sub, bar, barColor,
}: {
  tone: 'amber' | 'green' | 'blue' | 'gray'
  label: string; value: string; sub: string; bar?: number; barColor?: string
}) {
  const ring: Record<string, string> = {
    amber: 'border-amber-200', green: 'border-green-200', blue: 'border-blue-200', gray: 'border-border',
  }
  return (
    <div className={`bg-card border ${ring[tone]} rounded-2xl p-4 flex flex-col gap-1.5`}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
      {typeof bar === 'number' && (
        <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, bar)}%`, backgroundColor: barColor }} />
        </div>
      )}
    </div>
  )
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 text-center">
      <span className="text-lg font-black text-foreground tabular-nums leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
