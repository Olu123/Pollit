'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Poll } from '@/lib/types'

const MAX_EXTENSIONS = 2
const ACTIVE_DAY_OPTIONS = [1, 3, 7, 30] as const
const ENDED_DAY_OPTIONS = [3, 7] as const

function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

// Creator-only "Manage Your Poll" panel: lets the creator push the
// deadline back (or reactivate an ended poll), and — via the `?extend=N`
// query param — auto-applies an extension when the creator clicks an
// "Extend by N days" link straight from the expiry-reminder email.
export default function ManagePoll({
  poll,
  isCreator,
  onExtended,
}: {
  poll: Pick<Poll, 'id' | 'expires_at' | 'extension_count'>
  isCreator: boolean
  onExtended: (newExpiresAt: string) => void
}) {
  const router = useRouter()
  const [extending, setExtending] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const autoTriggered = useRef(false)

  const extend = useCallback(async (days: number) => {
    setExtending(days)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('extend_poll', {
      p_poll_id: poll.id,
      p_days: days,
    })
    setExtending(null)
    if (rpcError) {
      setError(
        rpcError.message.includes('max_extensions_reached') ? 'Maximum extensions reached.'
        : rpcError.message.includes('poll_already_ended') ? 'This poll has already ended.'
        : rpcError.message.includes('not_authorized') ? 'Only the poll creator can extend this poll.'
        : "Couldn't extend this poll. Please try again."
      )
      return
    }
    const newExpiresAt = (data as { new_expires_at?: string } | null)?.new_expires_at
    if (newExpiresAt) {
      onExtended(newExpiresAt)
      setSuccess(`Poll extended! New deadline: ${fmtDeadline(newExpiresAt)}`)
    }
  }, [poll.id, onExtended])

  // ?extend=N deep link from the expiry-reminder email — apply once, then
  // strip the param so a refresh doesn't re-trigger it.
  useEffect(() => {
    if (!isCreator || autoTriggered.current) return
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('extend')
    if (!raw) return
    autoTriggered.current = true
    const days = Number(raw)
    params.delete('extend')
    const query = params.toString()
    router.replace(window.location.pathname + (query ? `?${query}` : ''), { scroll: false })
    if (Number.isFinite(days) && days > 0) extend(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreator])

  if (!isCreator) return null

  const isEnded = new Date(poll.expires_at).getTime() <= Date.now()
  const extensionsUsed = poll.extension_count ?? 0
  const maxedOut = extensionsUsed >= MAX_EXTENSIONS

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Settings2 size={15} className="text-primary" strokeWidth={2.5} />
        Manage Your Poll
      </div>

      {maxedOut ? (
        <p className="text-sm text-muted-foreground">
          Maximum extensions reached. Contact us if you need more time.
        </p>
      ) : isEnded ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">This poll has ended.</p>
          <div className="flex flex-wrap gap-2">
            {ENDED_DAY_OPTIONS.map((d) => (
              <ExtendButton key={d} busy={extending === d} disabled={extending !== null} onClick={() => extend(d)}>
                Extend by {d} days
              </ExtendButton>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Extend this poll:</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVE_DAY_OPTIONS.map((d) => (
              <ExtendButton key={d} busy={extending === d} disabled={extending !== null} onClick={() => extend(d)}>
                +{d} day{d === 1 ? '' : 's'}
              </ExtendButton>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{extensionsUsed} of {MAX_EXTENSIONS} extensions used</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="flex items-center gap-2 text-sm text-primary bg-primary-light rounded-xl px-3 py-2 font-semibold">
          <CheckCircle2 size={15} strokeWidth={2.5} /> {success}
        </p>
      )}
    </div>
  )
}

function ExtendButton({
  busy, disabled, onClick, children,
}: {
  busy: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 bg-muted text-foreground text-sm font-semibold px-4 py-2 rounded-full hover:bg-border active:scale-95 transition-all disabled:opacity-50 min-h-[40px]"
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  )
}
