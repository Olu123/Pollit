'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  username: string | null
  status: string
  created_at: string
}

const STATUSES = ['all', 'unread', 'read', 'resolved'] as const
const SUBJECTS = [
  'all', 'General Enquiry', 'Report a Problem', 'Partnership / Advertising',
  'Media Enquiry', 'Account Issue', 'Feedback & Suggestions', 'Token / Rewards Query', 'Other',
]

const STATUS_STYLE: Record<string, string> = {
  unread: 'bg-red-100 text-red-700',
  read: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [ready, setReady] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Message | null>(null)

  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace('/')
  }, [loading, user, isAdmin, router])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setMessages((data ?? []) as Message[])
    setReady(true)
  }, [])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  async function setStatus(id: string, status: string) {
    await supabase.from('contact_messages').update({ status }).eq('id', id)
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)))
    setSelected((s) => (s && s.id === id ? { ...s, status } : s))
  }

  if (loading || !isAdmin) {
    return <main className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-primary" /></main>
  }

  const filtered = messages.filter((m) =>
    (statusFilter === 'all' || m.status === statusFilter) &&
    (subjectFilter === 'all' || m.subject === subjectFilter)
  )

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Mail size={22} className="text-primary" />
        <h1 className="text-2xl font-black text-foreground">Contact Messages</h1>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} shown</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary capitalize">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Subject</span>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
            className="border border-border rounded-lg px-2 py-1.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary">
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {!ready ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No messages.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => { setSelected(m); if (m.status === 'unread') setStatus(m.id, 'read') }}
              className="bg-card border border-border rounded-xl p-4 text-left hover:shadow-sm transition-shadow flex flex-col gap-1"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[m.status] ?? 'bg-muted text-muted-foreground'}`}>{m.status}</span>
                <span className="text-sm font-bold text-foreground">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(m.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              </div>
              <p className="text-xs font-semibold text-primary">{m.subject}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{m.message}</p>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-lg flex flex-col gap-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-foreground">{selected.subject}</h3>
                <p className="text-sm text-muted-foreground">{selected.name} · {selected.email}</p>
                {selected.username && <p className="text-xs text-muted-foreground">@{selected.username}</p>}
                <p className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString('en-NG')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={16} /></button>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap border-t border-border pt-3">{selected.message}</p>
            <div className="flex items-center gap-2 pt-1">
              <a href={`mailto:${selected.email}`} className="flex-1 inline-flex items-center justify-center bg-muted text-foreground text-sm font-semibold min-h-[44px] rounded-xl hover:bg-border transition-colors">Reply by email</a>
              <button onClick={() => setStatus(selected.id, 'read')} className="px-4 min-h-[44px] rounded-xl bg-amber-100 text-amber-700 text-sm font-semibold hover:bg-amber-200 transition-colors">Mark Read</button>
              <button onClick={() => setStatus(selected.id, 'resolved')} className="px-4 min-h-[44px] rounded-xl bg-green-100 text-green-700 text-sm font-semibold hover:bg-green-200 transition-colors">Resolve</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
