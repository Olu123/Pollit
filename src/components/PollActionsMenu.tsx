'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { useToast } from './ToastProvider'

export default function PollActionsMenu({
  pollId,
  createdBy,
  redirectHome = false,
}: {
  pollId: string
  createdBy: string | null
  redirectHome?: boolean
}) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canManage = !!user && (user.id === createdBy || profile?.is_admin === true)
  if (!canManage) return null

  async function handleDelete() {
    setBusy(true)
    setError('')
    const { error: rpcErr } = await supabase.rpc('delete_poll', { p_poll_id: pollId })
    if (rpcErr) {
      setError(
        rpcErr.message.includes('too_many_votes')
          ? 'This poll has too many votes to delete'
          : rpcErr.message.includes('not_authorized')
            ? 'You are not allowed to delete this poll'
            : 'Could not delete this poll'
      )
      setBusy(false)
      return
    }
    showToast('Poll deleted successfully')
    if (redirectHome) router.push('/')
    else router.refresh()
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Poll options"
          className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-10 z-40 w-44 bg-card border border-border rounded-xl shadow-lg py-1">
              <button
                onClick={() => { setOpen(false); setConfirming(true) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={15} /> Delete Poll
              </button>
            </div>
          </>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[80] bg-gray-950/60 flex items-center justify-center p-4" onClick={() => !busy && setConfirming(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-bold text-foreground">Delete this poll?</h3>
              <p className="text-sm text-muted-foreground mt-1">This cannot be undone.</p>
              <p className="text-xs text-muted-foreground mt-2">Note: Polls with 10+ votes cannot be deleted.</p>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
