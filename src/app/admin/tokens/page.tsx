'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  reason: string
  created_at: string
  user: { username: string | null } | null
  admin: { username: string | null } | null
}

interface UserResult { id: string; username: string | null; points: number }

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

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
