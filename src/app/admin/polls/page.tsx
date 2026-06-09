'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search } from 'lucide-react'

interface AdminPoll {
  id: string
  question: string
  category: string
  total_votes: number
  is_hot_take: boolean
  is_pinned: boolean
  is_community: boolean
  is_challenge: boolean
  challenge_pool: number
  challenge_status: string
  challenge_distributed: boolean
  deleted_at: string | null
  created_at: string
  expires_at: string
  creator_username: string | null
}

const CATEGORIES = ['All', 'Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle']

export default function AdminPollsPage() {
  const [polls,      setPolls]      = useState<AdminPoll[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('All')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'deleted'>('all')
  const [hotFilter,  setHotFilter]  = useState(false)
  const [busy,       setBusy]       = useState<string | null>(null)
  const [toast,      setToast]      = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('polls')
      .select(`
        id, question, category, total_votes, is_hot_take, is_pinned,
        is_community, is_challenge, challenge_pool, challenge_status, challenge_distributed,
        deleted_at, created_at, expires_at,
        profile:profiles!created_by ( username )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    const rows = (data ?? []).map((p: any) => ({
      ...p,
      creator_username: p.profile?.username ?? null,
    }))
    setPolls(rows as AdminPoll[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const now = new Date()
  const filtered = polls.filter(p => {
    if (search && !p.question.toLowerCase().includes(search.toLowerCase()) &&
        !(p.creator_username ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter !== 'All' && p.category !== catFilter) return false
    if (hotFilter && !p.is_hot_take) return false
    if (statusFilter === 'deleted' && !p.deleted_at) return false
    if (statusFilter === 'active' && (p.deleted_at || new Date(p.expires_at) < now)) return false
    if (statusFilter === 'expired' && (p.deleted_at || new Date(p.expires_at) >= now)) return false
    if (statusFilter === 'all' || statusFilter === 'deleted') return true
    return !p.deleted_at
  })

  async function rpc(fn: string, params: Record<string, unknown>, msg: string, id: string) {
    setBusy(id)
    await supabase.rpc(fn, params)
    setBusy(null)
    showToast(msg)
    load()
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 max-w-6xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[99] bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black text-foreground">Polls</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary w-48" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'expired' | 'deleted')}
          className="border border-border rounded-xl px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="deleted">Deleted</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={hotFilter} onChange={e => setHotFilter(e.target.checked)} className="accent-[#DC2626]" />
          Hot Takes only
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Question</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Creator</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Votes</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isDeleted = !!p.deleted_at
                  const isExpired = !isDeleted && new Date(p.expires_at) < now
                  const isBusy = busy === p.id
                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 max-w-[200px] sm:max-w-[280px]">
                        <p className="line-clamp-2 text-foreground">{p.question}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {p.is_hot_take && <Badge color="orange">Hot Take</Badge>}
                          {p.is_pinned   && <Badge color="blue">Pinned</Badge>}
                          {p.is_community && <Badge color="purple">Community</Badge>}
                          {p.is_challenge && <Badge color="amber">🏆 {p.challenge_pool.toLocaleString()}</Badge>}
                          {p.is_challenge && p.challenge_distributed && <Badge color="green">Paid out</Badge>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        {p.creator_username ? `@${p.creator_username}` : '—'}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{p.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{p.total_votes}</td>
                      <td className="py-3 px-4">
                        {isDeleted ? <Badge color="red">Deleted</Badge>
                          : isExpired ? <Badge color="gray">Expired</Badge>
                          : <Badge color="green">Active</Badge>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {!isDeleted && (
                            <>
                              <Btn disabled={isBusy} onClick={() => rpc('admin_toggle_hot_take', { p_poll_id: p.id }, p.is_hot_take ? 'Hot Take removed.' : 'Marked as Hot Take.', p.id)}>
                                {p.is_hot_take ? '−🔥' : '+🔥'}
                              </Btn>
                              <Btn disabled={isBusy} onClick={() => rpc('admin_toggle_pin', { p_poll_id: p.id }, p.is_pinned ? 'Poll unpinned.' : 'Poll pinned.', p.id)}>
                                {p.is_pinned ? 'Unpin' : 'Pin'}
                              </Btn>
                              {p.is_challenge && !p.challenge_distributed && (
                                <Btn disabled={isBusy} color="green" onClick={() => rpc('distribute_challenge_tokens', { p_poll_id: p.id }, 'Challenge pool distributed.', p.id)}>
                                  Distribute 🏆
                                </Btn>
                              )}
                              <Btn disabled={isBusy} color="red" onClick={() => rpc('admin_delete_poll', { p_poll_id: p.id }, 'Poll deleted.', p.id)}>Delete</Btn>
                            </>
                          )}
                          {isDeleted && (
                            <Btn disabled={isBusy} color="green" onClick={() => rpc('admin_restore_poll', { p_poll_id: p.id }, 'Poll restored.', p.id)}>Restore</Btn>
                          )}
                          {isBusy && <Loader2 size={14} className="animate-spin text-muted-foreground self-center" />}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No polls found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-700',
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    red:    'bg-red-100 text-red-700',
    gray:   'bg-gray-100 text-gray-600',
    green:  'bg-green-100 text-green-700',
  }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[color] ?? ''}`}>{children}</span>
}

function Btn({ onClick, disabled, color = 'default', children }: {
  onClick: () => void; disabled: boolean; color?: 'default' | 'red' | 'green'; children: React.ReactNode
}) {
  const cls = color === 'red' ? 'bg-red-100 text-red-700 hover:bg-red-200'
    : color === 'green' ? 'bg-green-100 text-green-700 hover:bg-green-200'
    : 'bg-muted text-foreground hover:bg-border'
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  )
}
