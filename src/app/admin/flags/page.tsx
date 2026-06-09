'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, X, ShieldAlert, Search } from 'lucide-react'

interface Flag {
  id: string
  user_id: string | null
  username: string | null
  flag_type: string
  details: Record<string, unknown> | null
  resolved: boolean
  created_at: string
  account_created_at: string | null
  user_flag_count: number
  is_suspended: boolean
}

interface FlaggedPoll {
  id: string
  question: string
  total_votes: number
  created_at: string
}

const TYPE_STYLE: Record<string, string> = {
  rapid_voting:        'bg-red-100 text-red-700',
  coordinated_voting:  'bg-red-100 text-red-700',
  new_account_burst:   'bg-orange-100 text-orange-700',
  device_cluster:      'bg-orange-100 text-orange-700',
  ip_cluster:          'bg-orange-100 text-orange-700',
  poll_creation_burst: 'bg-amber-100 text-amber-700',
}

const TYPE_LABEL: Record<string, string> = {
  rapid_voting:        'Rapid voting',
  coordinated_voting:  'Coordinated voting',
  new_account_burst:   'New account burst',
  poll_creation_burst: 'Poll creation burst',
  device_cluster:      'Device cluster',
  ip_cluster:          'IP cluster',
}

const STATUSES = ['unresolved', 'resolved', 'all'] as const
const RANGES = [
  { key: 'all', label: 'All time', days: 0 },
  { key: '7d',  label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
] as const

function typeLabel(t: string) { return TYPE_LABEL[t] ?? t.replace(/_/g, ' ') }

function accountAge(flag: Flag): string {
  if (!flag.account_created_at) return '—'
  const ms = new Date(flag.created_at).getTime() - new Date(flag.account_created_at).getTime()
  const hours = ms / 3_600_000
  if (hours < 48) return `${Math.max(0, Math.floor(hours))}h`
  return `${Math.floor(hours / 24)}d`
}

export default function AdminFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [polls, setPolls] = useState<FlaggedPoll[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('unresolved')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [range, setRange] = useState<string>('all')
  const [selected, setSelected] = useState<Flag | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [pollIdInput, setPollIdInput] = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: flagData }, { data: pollData }] = await Promise.all([
      supabase.rpc('admin_get_flags'),
      supabase
        .from('polls')
        .select('id, question, total_votes, created_at')
        .eq('is_flagged', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    setFlags((flagData ?? []) as Flag[])
    setPolls((pollData ?? []) as FlaggedPoll[])
    setChecked(new Set())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const now = Date.now()
  const filtered = flags.filter((f) => {
    if (status === 'unresolved' && f.resolved) return false
    if (status === 'resolved' && !f.resolved) return false
    if (typeFilter !== 'all' && f.flag_type !== typeFilter) return false
    const rangeDays = RANGES.find((r) => r.key === range)?.days ?? 0
    if (rangeDays > 0 && new Date(f.created_at).getTime() < now - rangeDays * 86_400_000) return false
    return true
  })

  const presentTypes = Array.from(new Set(flags.map((f) => f.flag_type)))

  // Stats
  const unresolved = flags.filter((f) => !f.resolved)
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const flagsToday = flags.filter((f) => new Date(f.created_at) >= startOfToday).length
  const flaggedUsers = new Set(unresolved.map((f) => f.user_id)).size

  async function resolveFlag(id: string) {
    setBusy(true)
    await supabase.rpc('admin_resolve_flag', { p_flag_id: id })
    setBusy(false); setSelected(null)
    showToast('Flag dismissed.'); load()
  }

  async function warnUser(flag: Flag) {
    if (!flag.user_id) return
    setBusy(true)
    await supabase.rpc('admin_warn_user', {
      p_user_id: flag.user_id,
      p_note: `Warned re: ${typeLabel(flag.flag_type)}`,
    })
    await supabase.rpc('admin_resolve_flag', { p_flag_id: flag.id })
    setBusy(false); setSelected(null)
    showToast(`@${flag.username ?? 'user'} warned.`); load()
  }

  async function suspendUser(flag: Flag) {
    if (!flag.user_id) return
    setBusy(true)
    await supabase.rpc('admin_suspend_user', {
      p_user_id: flag.user_id,
      p_reason: `Suspicious activity: ${typeLabel(flag.flag_type)}`,
    })
    await supabase.rpc('admin_resolve_flag', { p_flag_id: flag.id })
    setBusy(false); setSelected(null)
    showToast(`@${flag.username ?? 'user'} suspended.`); load()
  }

  async function bulkDismiss() {
    setBusy(true)
    for (const id of checked) await supabase.rpc('admin_resolve_flag', { p_flag_id: id })
    setBusy(false); showToast(`${checked.size} flag(s) dismissed.`); load()
  }

  async function bulkSuspend() {
    setBusy(true)
    const userIds = new Set(
      flags.filter((f) => checked.has(f.id) && f.user_id).map((f) => f.user_id as string)
    )
    for (const uid of userIds) {
      await supabase.rpc('admin_suspend_user', { p_user_id: uid, p_reason: 'Suspicious activity (bulk)' })
    }
    for (const id of checked) await supabase.rpc('admin_resolve_flag', { p_flag_id: id })
    setBusy(false); showToast(`${userIds.size} user(s) suspended.`); load()
  }

  async function clearPollFlag(id: string) {
    setBusy(true)
    await supabase.rpc('admin_clear_poll_flag', { p_poll_id: id })
    setBusy(false); showToast('Poll flag cleared.'); load()
  }

  async function deletePoll(id: string) {
    setBusy(true)
    await supabase.rpc('admin_delete_poll', { p_poll_id: id })
    setBusy(false); showToast('Poll deleted.'); load()
  }

  async function runCoordinationCheck(pollId: string) {
    const id = pollId.trim()
    if (!id) return
    setBusy(true)
    const { data, error } = await supabase.rpc('detect_coordinated_voting', { p_poll_id: id })
    setBusy(false)
    if (error) { showToast(error.message); return }
    const res = data as { suspicious?: boolean; cluster_size?: number } | null
    showToast(
      res?.suspicious
        ? `⚠️ Coordinated voting detected (cluster ${res.cluster_size}). Poll flagged.`
        : `No coordination found (cluster ${res?.cluster_size ?? 0}).`
    )
    setPollIdInput('')
    load()
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-6xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[99] bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in max-w-xs">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">🚨 Suspicious Activity</h1>
        <button onClick={load} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Unresolved flags" value={unresolved.length} accent="text-[#DC2626]" />
        <Stat label="Flags today" value={flagsToday} />
        <Stat label="Flagged users" value={flaggedUsers} />
        <Stat label="Flagged polls" value={polls.length} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                status === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>{s}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              typeFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}>All types</button>
          {presentTypes.map((tp) => (
            <button key={tp} onClick={() => setTypeFilter(tp)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === tp ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>{typeLabel(tp)}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                range === r.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>{r.label}</button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {checked.size > 0 && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2.5 sticky top-16 z-20">
          <span className="text-sm font-semibold text-foreground">{checked.size} selected</span>
          <button onClick={bulkDismiss} disabled={busy}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-border disabled:opacity-60">
            Dismiss all
          </button>
          <button onClick={bulkSuspend} disabled={busy}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#DC2626] text-white hover:brightness-95 disabled:opacity-60">
            Suspend all
          </button>
          <button onClick={() => setChecked(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
        </div>
      )}

      {/* Flags table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="w-10 py-3 px-3"></th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Account age</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">When</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} onClick={() => setSelected(f)}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(f.id)} onChange={() => toggleCheck(f.id)}
                        className="w-4 h-4 accent-[#DC2626] cursor-pointer" />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_STYLE[f.flag_type] ?? 'bg-muted text-muted-foreground'}`}>
                        {typeLabel(f.flag_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      <span className="font-medium">@{f.username ?? '—'}</span>
                      {f.is_suspended && <span className="ml-1.5 text-[10px] font-bold text-red-600">SUSPENDED</span>}
                      {f.user_flag_count > 1 && <span className="ml-1.5 text-[10px] text-muted-foreground">×{f.user_flag_count}</span>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{accountAge(f)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.resolved ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                        {f.resolved ? 'Resolved' : 'Open'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">No flags match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged polls */}
      <div className="flex flex-col gap-3 mt-2">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#DC2626]" /> Flagged Polls
        </h2>

        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            value={pollIdInput}
            onChange={(e) => setPollIdInput(e.target.value)}
            placeholder="Paste a poll ID to run a coordination check…"
            className="flex-1 bg-transparent text-sm outline-none py-1.5 min-w-0"
          />
          <button onClick={() => runCoordinationCheck(pollIdInput)} disabled={busy || !pollIdInput.trim()}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap">
            Run check
          </button>
        </div>

        {polls.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-6 text-center">No flagged polls.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {polls.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{p.question}</p>
                  <p className="text-xs text-muted-foreground">{p.total_votes} votes · {new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/polls/${p.id}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-border">View</Link>
                  <button onClick={() => runCoordinationCheck(p.id)} disabled={busy}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted text-foreground hover:bg-border disabled:opacity-60">Re-check</button>
                  <button onClick={() => clearPollFlag(p.id)} disabled={busy}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60">Clear flag</button>
                  <button onClick={() => deletePoll(p.id)} disabled={busy}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#DC2626] text-white hover:brightness-95 disabled:opacity-60">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-md flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-foreground">Flag Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={15} /></button>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Type" value={typeLabel(selected.flag_type)} />
              <Row label="User" value={`@${selected.username ?? '—'}`} />
              <Row label="Total flags" value={String(selected.user_flag_count)} />
              <Row label="Account age" value={accountAge(selected)} />
              <Row label="Flagged at" value={new Date(selected.created_at).toLocaleString('en-NG')} />
              <Row label="Suspended" value={selected.is_suspended ? 'Yes' : 'No'} />
            </div>
            {selected.details && (
              <pre className="text-xs bg-muted/50 rounded-xl p-3 overflow-x-auto text-muted-foreground">
                {JSON.stringify(selected.details, null, 2)}
              </pre>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Link href="/admin/users" className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted text-foreground hover:bg-border">View user</Link>
              <Link href="/admin/polls" className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted text-foreground hover:bg-border">View polls</Link>
              {!selected.resolved && (
                <>
                  <button onClick={() => resolveFlag(selected.id)} disabled={busy}
                    className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted text-foreground hover:bg-border disabled:opacity-60">Dismiss</button>
                  <button onClick={() => warnUser(selected)} disabled={busy}
                    className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-60">Warn user</button>
                  <button onClick={() => suspendUser(selected)} disabled={busy}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-[#DC2626] text-white hover:brightness-95 disabled:opacity-60">Suspend user</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <p className={`text-2xl font-black tabular-nums ${accent ?? 'text-foreground'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-foreground break-words">{value}</span>
    </div>
  )
}
