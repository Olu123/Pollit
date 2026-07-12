'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Trophy } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  reason: string
  created_at: string
  user: { username: string | null } | null
  admin: { username: string | null } | null
}

interface UserResult { id: string; username: string | null; points: number }

interface MonthlyEntry { rank: number; user_id: string; username: string | null; monthly_tokens: number }
interface Winner { rank: number; user_id: string; username: string | null; tokens: number; prize_ngn: number }

const PRIZE_TIERS_NGN = [20000, 10000, 7000, 5000, 3000, 500, 500, 500, 500, 500]

const EARN_RATES = [
  { action: 'Cast a vote',      tokens: 5 },
  { action: 'Create a poll',    tokens: 20 },
  { action: 'Join a challenge', tokens: 7 },
  { action: 'Refer a friend',   tokens: 30 },
]

export default function AdminTokensPage() {
  const [txns,      setTxns]      = useState<Transaction[]>([])
  const [loading,   setLoading]   = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null)
  const [amount,    setAmount]    = useState('')
  const [reason,    setReason]    = useState('')
  const [busy,      setBusy]      = useState(false)
  const [toast,     setToast]     = useState('')

  const [prizeModalOpen, setPrizeModalOpen] = useState(false)
  const [monthlyTop10, setMonthlyTop10]     = useState<MonthlyEntry[]>([])
  const [alreadyDistributed, setAlreadyDistributed] = useState(false)
  const [distributing, setDistributing]     = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function openPrizeModal() {
    const now = new Date()
    const [{ data: top10 }, { data: existing }] = await Promise.all([
      supabase.rpc('monthly_leaderboard'),
      supabase.rpc('get_monthly_prize', { p_month: now.getMonth() + 1, p_year: now.getFullYear() }),
    ])
    setMonthlyTop10((top10 ?? []) as MonthlyEntry[])
    setAlreadyDistributed(existing?.status === 'distributed')
    setPrizeModalOpen(true)
  }

  async function handleDistribute() {
    setDistributing(true)
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data, error } = await supabase.rpc('admin_distribute_monthly_prize', {
      p_month: month, p_year: year,
    })

    if (error) {
      setDistributing(false)
      showToast(error.message.includes('already_distributed') ? 'Already distributed this month.' : error.message)
      return
    }

    const winners = (data?.winners ?? []) as Winner[]

    // Email + announcement are best-effort — the distribution itself (the
    // part that moves tokens) already succeeded above.
    await fetch('/api/admin/notify-monthly-winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year, winners }),
    }).catch(() => {})

    const top = winners[0]
    if (top) {
      const monthName = now.toLocaleString('en-NG', { month: 'long' })
      await supabase.from('announcements').insert({
        message: `🎉 ${monthName} Winners Announced! @${top.username ?? 'anonymous'} won ₦${top.prize_ngn.toLocaleString()}! Check the leaderboard for the full list.`,
      })
    }

    setDistributing(false)
    setPrizeModalOpen(false)
    showToast(`Monthly prize distributed to ${winners.length} winners! 🏆`)
  }

  const loadTxns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('token_transactions')
      .select(`
        id, amount, reason, created_at,
        user:profiles!user_id ( username ),
        admin:profiles!created_by ( username )
      `)
      .order('created_at', { ascending: false })
      .limit(100)
    setTxns((data ?? []) as unknown as Transaction[])
    setLoading(false)
  }, [])

  useEffect(() => { loadTxns() }, [loadTxns])

  async function searchUsers(q: string) {
    if (!q.trim()) { setUserResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, points')
      .ilike('username', `%${q}%`)
      .limit(5)
    setUserResults((data ?? []) as UserResult[])
  }

  async function handleAdjust() {
    if (!selectedUser || !amount || !reason.trim()) return
    const amt = parseInt(amount)
    if (isNaN(amt) || amt === 0) return
    setBusy(true)
    await supabase.rpc('admin_adjust_tokens', {
      p_user_id: selectedUser.id,
      p_amount: amt,
      p_reason: reason,
    })
    setBusy(false)
    showToast(`${amt > 0 ? '+' : ''}${amt} tokens applied to @${selectedUser.username}`)
    setSelectedUser(null)
    setUserSearch('')
    setUserResults([])
    setAmount('')
    setReason('')
    loadTxns()
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-4xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[99] bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-black text-foreground">Tokens</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Manual adjustment */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Manual Adjustment</p>

          {/* User search */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search user</label>
            {selectedUser ? (
              <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                <span className="text-sm font-semibold text-foreground">@{selectedUser.username}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedUser.points} tokens</span>
                  <button onClick={() => { setSelectedUser(null); setUserSearch(''); setUserResults([]) }}
                    className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); searchUsers(e.target.value) }}
                  placeholder="Username…"
                  className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary" />
                {userResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                    {userResults.map(u => (
                      <button key={u.id} onClick={() => { setSelectedUser(u); setUserSearch(''); setUserResults([]) }}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                        <span className="font-medium">@{u.username}</span>
                        <span className="text-xs text-muted-foreground">{u.points} tokens</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Amount (negative to deduct)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 100 or -50"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Welcome bonus"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <button onClick={handleAdjust}
            disabled={busy || !selectedUser || !amount || !reason.trim() || isNaN(parseInt(amount)) || parseInt(amount) === 0}
            className="w-full min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Apply Adjustment'}
          </button>
        </div>

        {/* Earn rates */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground">Current Earn Rates</p>
          <p className="text-xs text-muted-foreground">Defined in <code className="font-mono bg-muted px-1 rounded">schema.sql</code> RPCs.</p>
          <div className="divide-y divide-border">
            {EARN_RATES.map(r => (
              <div key={r.action} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-foreground">{r.action}</span>
                <span className="text-sm font-bold text-primary">+{r.tokens}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly prize distribution */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Trophy size={15} className="text-amber-500" /> Distribute Monthly Prize
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Awards bonus tokens to this month&rsquo;s top 10 by tokens earned and notifies them by email.
          </p>
        </div>
        <button
          onClick={openPrizeModal}
          className="shrink-0 min-h-[44px] px-4 rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-95 transition-all"
        >
          Preview & Distribute
        </button>
      </div>

      {prizeModalOpen && (
        <Modal title="🏆 Distribute Monthly Prize" onClose={() => !distributing && setPrizeModalOpen(false)}>
          {alreadyDistributed ? (
            <p className="text-sm text-foreground/80">This month&rsquo;s prize has already been distributed.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {monthlyTop10.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No token activity this month yet.</p>
                ) : (
                  monthlyTop10.map((e) => (
                    <div key={e.user_id} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">#{e.rank} @{e.username ?? 'anonymous'}</span>
                      <span className="text-muted-foreground">
                        {e.monthly_tokens.toLocaleString()} tokens · ₦{(PRIZE_TIERS_NGN[e.rank - 1] ?? 0).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setPrizeModalOpen(false)}
                  disabled={distributing}
                  className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={distributing || monthlyTop10.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60"
                >
                  {distributing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Distribute'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Transaction history */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Transaction History <span className="text-muted-foreground font-normal">(last 100)</span></p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-primary" /></div>
        ) : txns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No manual transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">User</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Reason</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden sm:table-cell">By</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="border-b border-border">
                    <td className="py-3 px-4 font-medium text-foreground">@{t.user?.username ?? '—'}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount >= 0 ? '+' : ''}{t.amount}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[160px] truncate">{t.reason}</td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">@{t.admin?.username ?? '—'}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">
                      {new Date(t.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  )
}
