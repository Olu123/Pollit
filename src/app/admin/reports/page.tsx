'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, X } from 'lucide-react'

interface Report {
  id: string
  reason: string
  status: string
  created_at: string
  poll_id: string | null
  comment_id: string | null
  reporter: { username: string | null } | null
  poll: { question: string } | null
}

const STATUSES = ['all', 'open', 'dismissed'] as const

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<string>('open')
  const [selected, setSelected] = useState<Report | null>(null)
  const [busy,    setBusy]    = useState(false)
  const [toast,   setToast]   = useState('')

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select(`
        id, reason, status, created_at, poll_id, comment_id,
        reporter:profiles!reporter_id ( username ),
        poll:polls!poll_id ( question )
      `)
      .order('created_at', { ascending: false })
      .limit(300)
    setReports((data ?? []) as unknown as Report[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = reports.filter(r => filter === 'all' || r.status === filter)

  async function dismiss(id: string) {
    setBusy(true)
    await supabase.rpc('admin_dismiss_report', { p_report_id: id })
    setBusy(false)
    setSelected(null)
    showToast('Report dismissed.')
    load()
  }

  async function deleteContent(report: Report) {
    setBusy(true)
    if (report.poll_id) {
      await supabase.rpc('admin_delete_poll', { p_poll_id: report.poll_id })
    } else if (report.comment_id) {
      // Soft-delete the vote/comment row
      await supabase.from('votes').update({ comment: null }).eq('id', report.comment_id)
    }
    await supabase.rpc('admin_dismiss_report', { p_report_id: report.id })
    setBusy(false)
    setSelected(null)
    showToast('Content deleted and report closed.')
    load()
  }

  async function suspendReportedUser(report: Report) {
    setBusy(true)
    // Find creator of reported poll
    if (report.poll_id) {
      const { data: poll } = await supabase.from('polls').select('created_by').eq('id', report.poll_id).single()
      if (poll?.created_by) {
        await supabase.rpc('admin_suspend_user', { p_user_id: poll.created_by, p_reason: `Reported: ${report.reason}` })
      }
    }
    await supabase.rpc('admin_dismiss_report', { p_report_id: report.id })
    setBusy(false)
    setSelected(null)
    showToast('User suspended and report closed.')
    load()
  }

  const STATUS_STYLE: Record<string, string> = {
    open:      'bg-red-100 text-red-700',
    dismissed: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4 max-w-5xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[99] bg-foreground text-background text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black text-foreground">Reports</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} shown</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              filter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Reason</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Content</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">Reporter</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelected(r)}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="py-3 px-4 text-foreground max-w-[150px] truncate">{r.reason}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground max-w-[200px]">
                      {r.poll ? (
                        <span className="line-clamp-1">{r.poll.question}</span>
                      ) : r.comment_id ? (
                        <span className="italic">Comment #{r.comment_id.slice(0, 6)}…</span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      @{r.reporter?.username ?? '—'}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No reports.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-md flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-foreground">Report Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"><X size={15} /></button>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Row label="Reason"    value={selected.reason} />
              <Row label="Reporter"  value={`@${selected.reporter?.username ?? '—'}`} />
              <Row label="Date"      value={new Date(selected.created_at).toLocaleString('en-NG')} />
              <Row label="Type"      value={selected.poll_id ? 'Poll' : 'Comment'} />
              {selected.poll && <Row label="Poll" value={selected.poll.question} />}
            </div>
            {selected.status === 'open' && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <button onClick={() => dismiss(selected.id)} disabled={busy}
                  className="w-full min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors disabled:opacity-60">
                  {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Dismiss Report'}
                </button>
                <button onClick={() => deleteContent(selected)} disabled={busy}
                  className="w-full min-h-[44px] rounded-xl bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200 transition-colors disabled:opacity-60">
                  Delete Content + Close
                </button>
                {selected.poll_id && (
                  <button onClick={() => suspendReportedUser(selected)} disabled={busy}
                    className="w-full min-h-[44px] rounded-xl bg-[#DC2626] text-white text-sm font-bold hover:brightness-95 transition-all disabled:opacity-60">
                    Suspend Creator + Close
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
