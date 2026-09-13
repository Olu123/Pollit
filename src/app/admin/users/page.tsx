'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import AmbassadorBadge from '@/components/AmbassadorBadge'
import RoleBadge from '@/components/RoleBadge'
import { useAuth } from '@/components/AuthProvider'
import { canAssignRoles, canModerate, canAdjustTokensNow } from '@/lib/adminPermissions'
import type { AdminRole } from '@/lib/types'

interface AdminUser {
  id: string
  username: string | null
  email: string
  points: number
  is_admin: boolean
  is_suspended: boolean
  is_ambassador: boolean
  ambassador_university: string | null
  admin_role: AdminRole | null
  token_permission_expires_at: string | null
  created_at: string
  poll_count: number
  vote_count: number
}

type AmbassadorFilter = 'all' | 'ambassadors' | 'non_ambassadors'
const ROLE_OPTIONS: { value: AdminRole | ''; label: string }[] = [
  { value: '',            label: 'No admin role' },
  { value: 'support',     label: 'Support (read-only)' },
  { value: 'moderator',   label: 'Moderator' },
  { value: 'super_admin', label: 'Super Admin' },
]

function hasActiveTokenWindow(u: Pick<AdminUser, 'token_permission_expires_at'>): boolean {
  return !!u.token_permission_expires_at && new Date(u.token_permission_expires_at).getTime() > Date.now()
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ambassadorFilter, setAmbassadorFilter] = useState<AmbassadorFilter>('all')

  // Modal state for token adjustment
  const [tokenModal, setTokenModal] = useState<{ userId: string; username: string } | null>(null)
  const [tokenAmt,   setTokenAmt]   = useState('')
  const [tokenReason, setTokenReason] = useState('')
  const [suspendModal, setSuspendModal] = useState<{ userId: string; username: string } | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [ambassadorModal, setAmbassadorModal] = useState<{ userId: string; username: string } | null>(null)
  const [ambassadorUniversity, setAmbassadorUniversity] = useState('')
  const [roleModal, setRoleModal] = useState<{ userId: string; username: string } | null>(null)
  const [roleChoice, setRoleChoice] = useState<AdminRole | ''>('')
  const [windowModal, setWindowModal] = useState<{ userId: string; username: string } | null>(null)
  const [windowHours, setWindowHours] = useState('24')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const { profile: viewerProfile } = useAuth()
  const iCanAssignRoles = canAssignRoles(viewerProfile)
  const iCanModerate    = canModerate(viewerProfile)
  const iCanAdjustTokensNow = canAdjustTokensNow(viewerProfile)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('admin_get_users')
    setUsers((data ?? []) as AdminUser[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesAmbassador =
      ambassadorFilter === 'all' ||
      (ambassadorFilter === 'ambassadors' && u.is_ambassador) ||
      (ambassadorFilter === 'non_ambassadors' && !u.is_ambassador)
    return matchesSearch && matchesAmbassador
  })

  async function suspend(userId: string, reason: string) {
    setBusy(true)
    await supabase.rpc('admin_suspend_user', { p_user_id: userId, p_reason: reason })
    setBusy(false)
    setSuspendModal(null)
    setSuspendReason('')
    showToast('User suspended.')
    load()
  }

  async function unsuspend(userId: string) {
    setBusy(true)
    await supabase.rpc('admin_unsuspend_user', { p_user_id: userId })
    setBusy(false)
    showToast('User unsuspended.')
    load()
  }

  async function setRole(userId: string, role: AdminRole | '') {
    setBusy(true)
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role || null })
    setBusy(false)
    setRoleModal(null)
    if (error) { showToast(error.message); return }
    showToast(role ? `Role set to ${role.replace('_', ' ')}.` : 'Admin role removed.')
    load()
  }

  async function grantTokenWindow(userId: string, hours: number) {
    setBusy(true)
    const { error } = await supabase.rpc('admin_grant_token_window', { p_user_id: userId, p_hours: hours })
    setBusy(false)
    setWindowModal(null)
    if (error) { showToast(error.message); return }
    showToast(`Token access granted for ${hours}h.`)
    load()
  }

  async function revokeTokenWindow(userId: string) {
    setBusy(true)
    await supabase.rpc('admin_revoke_token_window', { p_user_id: userId })
    setBusy(false)
    showToast('Token access window revoked.')
    load()
  }

  async function setAmbassador(userId: string, isAmbassador: boolean, university: string) {
    setBusy(true)
    await supabase.rpc('admin_set_ambassador', { p_user_id: userId, p_is_ambassador: isAmbassador, p_university: university || null })
    setBusy(false)
    setAmbassadorModal(null)
    setAmbassadorUniversity('')
    showToast(isAmbassador ? 'User is now a Campus Ambassador.' : 'Campus Ambassador status removed.')
    load()
  }

  async function adjustTokens(userId: string, amount: number, reason: string) {
    setBusy(true)
    await supabase.rpc('admin_adjust_tokens', { p_user_id: userId, p_amount: amount, p_reason: reason })
    setBusy(false)
    setTokenModal(null)
    setTokenAmt('')
    setTokenReason('')
    showToast(`Tokens adjusted: ${amount > 0 ? '+' : ''}${amount}`)
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
        <h1 className="text-xl font-black text-foreground">Users</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={ambassadorFilter}
          onChange={e => setAmbassadorFilter(e.target.value as AmbassadorFilter)}
          className="border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All users</option>
          <option value="ambassadors">🎓 Ambassadors only</option>
          <option value="non_ambassadors">Non-ambassadors</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Email</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground">Tokens</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Polls</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Votes</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Joined</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="py-3 px-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <>
                    <tr
                      key={u.id}
                      onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            @{u.username ?? '—'}
                            <AmbassadorBadge isAmbassador={u.is_ambassador} />
                          </span>
                          {u.is_ambassador && u.ambassador_university && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{u.ambassador_university}</span>
                          )}
                          <span className="text-xs text-muted-foreground sm:hidden truncate max-w-[140px]">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell truncate max-w-[180px]">{u.email || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">{u.points.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground hidden md:table-cell">{u.poll_count}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground hidden md:table-cell">{u.vote_count}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <RoleBadge role={u.admin_role} />
                          {hasActiveTokenWindow(u) && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full" title={new Date(u.token_permission_expires_at!).toLocaleString('en-NG')}>
                              🔓 Token access
                            </span>
                          )}
                          {u.is_suspended ? (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Suspended</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {expanded === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>
                    {expanded === u.id && (
                      <tr key={`${u.id}-exp`} className="border-b border-border bg-muted/20">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {iCanModerate && (
                              u.is_suspended ? (
                                <ActionBtn onClick={() => unsuspend(u.id)} disabled={busy} color="green">Unsuspend</ActionBtn>
                              ) : (
                                <ActionBtn onClick={() => { setSuspendModal({ userId: u.id, username: u.username ?? u.id }); setSuspendReason('') }} disabled={busy} color="red">Suspend</ActionBtn>
                              )
                            )}
                            {iCanAssignRoles && (
                              <ActionBtn
                                onClick={() => { setRoleModal({ userId: u.id, username: u.username ?? u.id }); setRoleChoice(u.admin_role ?? '') }}
                                disabled={busy}
                                color="default"
                              >
                                Manage Role
                              </ActionBtn>
                            )}
                            {iCanAssignRoles && (u.admin_role === 'support' || u.admin_role === 'super_admin') && (
                              hasActiveTokenWindow(u) ? (
                                <ActionBtn onClick={() => revokeTokenWindow(u.id)} disabled={busy} color="red">
                                  Revoke Token Access
                                </ActionBtn>
                              ) : (
                                <ActionBtn
                                  onClick={() => { setWindowModal({ userId: u.id, username: u.username ?? u.id }); setWindowHours('24') }}
                                  disabled={busy}
                                  color="green"
                                >
                                  🔓 Grant Token Access
                                </ActionBtn>
                              )
                            )}
                            {iCanAdjustTokensNow && (
                              <ActionBtn
                                onClick={() => { setTokenModal({ userId: u.id, username: u.username ?? u.id }); setTokenAmt(''); setTokenReason('') }}
                                disabled={busy}
                                color="default"
                              >
                                Adjust Tokens
                              </ActionBtn>
                            )}
                            {iCanAssignRoles && (
                              u.is_ambassador ? (
                                <>
                                  <ActionBtn
                                    onClick={() => { setAmbassadorModal({ userId: u.id, username: u.username ?? u.id }); setAmbassadorUniversity(u.ambassador_university ?? '') }}
                                    disabled={busy}
                                    color="default"
                                  >
                                    Edit University
                                  </ActionBtn>
                                  <ActionBtn onClick={() => setAmbassador(u.id, false, '')} disabled={busy} color="red">
                                    Remove Ambassador
                                  </ActionBtn>
                                </>
                              ) : (
                                <ActionBtn
                                  onClick={() => { setAmbassadorModal({ userId: u.id, username: u.username ?? u.id }); setAmbassadorUniversity('') }}
                                  disabled={busy}
                                  color="green"
                                >
                                  🎓 Make Ambassador
                                </ActionBtn>
                              )
                            )}
                            <span className="text-xs text-muted-foreground self-center">
                              ID: <code className="font-mono">{u.id.slice(0, 8)}…</code>
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suspend modal */}
      {suspendModal && (
        <Modal title={`Suspend @${suspendModal.username}`} onClose={() => setSuspendModal(null)}>
          <p className="text-sm text-muted-foreground mb-3">This user won't be able to vote or create polls.</p>
          <label className="block text-xs font-semibold text-foreground mb-1">Reason</label>
          <textarea
            value={suspendReason}
            onChange={e => setSuspendReason(e.target.value)}
            rows={3}
            placeholder="Why is this user being suspended?"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2 mt-4">
            <button onClick={() => setSuspendModal(null)} className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">Cancel</button>
            <button
              onClick={() => suspend(suspendModal.userId, suspendReason)}
              disabled={busy || !suspendReason.trim()}
              className="flex-1 min-h-[44px] rounded-xl bg-[#DC2626] text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}

      {/* Token modal */}
      {tokenModal && (
        <Modal title={`Adjust tokens — @${tokenModal.username}`} onClose={() => setTokenModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Amount (use negative to deduct)</label>
              <input
                type="number"
                value={tokenAmt}
                onChange={e => setTokenAmt(e.target.value)}
                placeholder="e.g. 100 or -50"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Reason</label>
              <input
                type="text"
                value={tokenReason}
                onChange={e => setTokenReason(e.target.value)}
                placeholder="e.g. Bonus for bug report"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTokenModal(null)} className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">Cancel</button>
              <button
                onClick={() => adjustTokens(tokenModal.userId, parseInt(tokenAmt), tokenReason)}
                disabled={busy || !tokenAmt || !tokenReason.trim() || isNaN(parseInt(tokenAmt))}
                className="flex-1 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Apply'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ambassador modal */}
      {ambassadorModal && (
        <Modal title={`🎓 Campus Ambassador — @${ambassadorModal.username}`} onClose={() => setAmbassadorModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">University</label>
              <input
                type="text"
                value={ambassadorUniversity}
                onChange={e => setAmbassadorUniversity(e.target.value)}
                placeholder="e.g. University of Lagos"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAmbassadorModal(null)} className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">Cancel</button>
              <button
                onClick={() => setAmbassador(ambassadorModal.userId, true, ambassadorUniversity.trim())}
                disabled={busy || !ambassadorUniversity.trim()}
                className="flex-1 min-h-[44px] rounded-xl bg-green-600 text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Role modal */}
      {roleModal && (
        <Modal title={`Manage role — @${roleModal.username}`} onClose={() => setRoleModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Admin role</label>
              <select
                value={roleChoice}
                onChange={e => setRoleChoice(e.target.value as AdminRole | '')}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                super_admin: full access. moderator: flags, reports, suspensions, poll moderation. support: read-only, plus token adjustments only while a token access window is open.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRoleModal(null)} className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">Cancel</button>
              <button
                onClick={() => setRole(roleModal.userId, roleChoice)}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Token access window modal */}
      {windowModal && (
        <Modal title={`Grant temporary token access — @${windowModal.username}`} onClose={() => setWindowModal(null)}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              While this window is open, this user can adjust other users&rsquo; tokens. It expires automatically — no standing access.
            </p>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Duration (hours, max 168 / 1 week)</label>
              <input
                type="number"
                min={1}
                max={168}
                value={windowHours}
                onChange={e => setWindowHours(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWindowModal(null)} className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">Cancel</button>
              <button
                onClick={() => grantTokenWindow(windowModal.userId, parseInt(windowHours))}
                disabled={busy || !windowHours || isNaN(parseInt(windowHours)) || parseInt(windowHours) <= 0 || parseInt(windowHours) > 168}
                className="flex-1 min-h-[44px] rounded-xl bg-green-600 text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Grant Access'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ActionBtn({ onClick, disabled, color, children }: {
  onClick: () => void; disabled: boolean; color: 'default' | 'red' | 'green'; children: React.ReactNode
}) {
  const cls = color === 'red'
    ? 'bg-red-100 text-red-700 hover:bg-red-200'
    : color === 'green'
    ? 'bg-green-100 text-green-700 hover:bg-green-200'
    : 'bg-muted text-foreground hover:bg-border'
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-foreground">{title}</h3>
        {children}
      </div>
    </div>
  )
}
