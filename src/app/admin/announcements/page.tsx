'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Megaphone, Trash2 } from 'lucide-react'

interface Announcement {
  id: string
  message: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export default function AdminAnnouncementsPage() {
  const [items,   setItems]   = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [expires, setExpires] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [toast,   setToast]   = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('id, message, is_active, expires_at, created_at')
      .order('created_at', { ascending: false })
    setItems((data ?? []) as Announcement[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!message.trim()) return
    setBusy(true)
    const { data: profile } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      message: message.trim(),
      is_active: true,
      expires_at: expires || null,
      created_by: profile.user?.id,
    })
    setBusy(false)
    setMessage('')
    setExpires('')
    showToast('Announcement created.')
    load()
  }

  async function toggle(id: string, current: boolean) {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    showToast(!current ? 'Announcement activated.' : 'Announcement deactivated.')
    load()
  }

  async function remove(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    showToast('Announcement deleted.')
    load()
  }

  const active = items.filter(i => i.is_active && (!i.expires_at || new Date(i.expires_at) > new Date()))

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-3xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[99] bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Megaphone size={20} className="text-primary" />
        <h1 className="text-xl font-black text-foreground">Announcements</h1>
      </div>

      {/* Active preview */}
      {active.length > 0 && (
        <div className="bg-[#DC2626] text-white rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <span className="shrink-0">📢</span>
          <span className="flex-1">{active[0].message}</span>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">Live</span>
        </div>
      )}

      {/* Create form */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">New Announcement</p>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="e.g. WePollit is running a token giveaway this week — vote on any poll to enter!"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-0.5">{message.length}/280</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Expires at (optional)</label>
          <input
            type="datetime-local"
            value={expires}
            onChange={e => setExpires(e.target.value)}
            className="border border-border rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={create}
          disabled={busy || !message.trim()}
          className="w-full min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Publish Announcement'}
        </button>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">All Announcements</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No announcements yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const expired = item.expires_at && new Date(item.expires_at) <= new Date()
              const live = item.is_active && !expired
              return (
                <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {live    && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Live</span>}
                      {expired && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Expired</span>}
                      {!item.is_active && !expired && <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Off</span>}
                      {item.expires_at && (
                        <span className="text-xs text-muted-foreground">
                          Expires {new Date(item.expires_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(item.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle(item.id, item.is_active)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        item.is_active
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-[#DC2626] hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
