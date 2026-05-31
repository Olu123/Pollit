'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { useToast } from './ToastProvider'

const REASONS = [
  'Misleading or false information',
  'Hate speech or discrimination',
  'Spam',
  'Inappropriate content',
  'Other',
]

export default function ReportButton({
  pollId,
  commentId,
  size = 13,
}: {
  pollId?: string
  commentId?: string
  size?: number
}) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!user) { setError('Sign in to report.'); return }
    setBusy(true)
    setError('')
    const { error: insErr } = await supabase.from('reports').insert({
      reporter_id: user.id,
      poll_id: pollId ?? null,
      comment_id: commentId ?? null,
      reason,
    })
    setBusy(false)
    if (insErr) { setError('Could not submit report.'); return }
    setOpen(false)
    showToast('Report submitted. Thank you.')
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        aria-label="Report"
        title="Report"
        className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground/60 hover:text-red-500 hover:bg-muted transition-colors"
      >
        <Flag size={size} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[85] bg-gray-950/60 flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl p-5 w-full max-w-sm flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-foreground">
              Report this {commentId ? 'comment' : 'poll'}
            </h3>
            <div className="flex flex-col gap-1">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 py-2 cursor-pointer text-sm text-foreground">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[#DC2626] w-4 h-4"
                  />
                  {r}
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#DC2626] text-white text-sm font-bold hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : 'Submit Report'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              For urgent issues, visit our{' '}
              <Link href="/contact" onClick={() => setOpen(false)} className="text-primary font-semibold">Contact page</Link>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
