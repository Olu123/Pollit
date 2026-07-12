'use client'

import { useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ToastProvider'

export default function TipButton({
  voteId,
  recipientUsername,
  isOwnComment,
  onTipped,
}: {
  voteId: string
  recipientUsername: string | null
  isOwnComment: boolean
  onTipped: () => void
}) {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (isOwnComment) return null

  const balance = profile?.points ?? 0
  const parsedAmount = Math.floor(Number(amount))
  const validAmount = amount !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0

  async function submit() {
    if (!user) { setError(t('vote.signInBtn')); return }
    if (!validAmount) return
    if (parsedAmount > balance) { setError(t('comments.tipInsufficientBalance')); return }

    setBusy(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('tip_comment', {
      p_vote_id: voteId,
      p_amount: parsedAmount,
    })
    setBusy(false)

    if (rpcError) {
      setError(
        rpcError.message.includes('insufficient_balance')  ? t('comments.tipInsufficientBalance') :
        rpcError.message.includes('cannot_tip_self')        ? t('comments.tipSelf') :
        rpcError.message.includes('hourly_tip_limit_reached') ? 'You have hit the hourly tip limit. Try again later.' :
        rpcError.message.includes('amount_too_large')       ? 'That tip is too large.' :
        rpcError.message
      )
      return
    }

    await refreshProfile()
    onTipped()
    setOpen(false)
    setAmount('')
    showToast(`${t('comments.tipSuccess')} ${parsedAmount} → @${recipientUsername ?? 'user'}`)
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        aria-label={t('comments.tip')}
        title={t('comments.tip')}
        className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground/60 hover:text-amber-600 hover:bg-muted transition-colors"
      >
        <Gift size={13} />
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
            <h3 className="font-bold text-foreground">{t('comments.tipModalTitle')}</h3>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                {t('comments.tipAmountLabel')}
              </label>
              <input
                type="number"
                min={1}
                max={balance}
                inputMode="numeric"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError('') }}
                placeholder="e.g. 10"
                className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('comments.tipBalance')}: {balance.toLocaleString()}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors"
              >
                {t('edit.cancel')}
              </button>
              <button
                onClick={submit}
                disabled={busy || !validAmount || parsedAmount > balance}
                className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-amber-500 text-white text-sm font-bold hover:brightness-95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : t('comments.tip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
