'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, X, Share } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPendingVotes, removePendingVote } from '@/lib/voteQueue'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BIPEvent = any

const DISMISS_KEY = 'pollit_install_dismissed'

export default function PwaRegister() {
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  // Flush votes queued while offline (called on reconnect + SW message).
  const flushVotes = useCallback(async () => {
    const pending = getPendingVotes()
    for (const v of pending) {
      const { error } = await supabase.rpc('cast_vote', {
        p_poll_id: v.poll_id,
        p_option_id: v.option_id,
        p_comment: v.comment,
      })
      if (!error || error.message.includes('already_voted')) {
        removePendingVote(v.poll_id)
      }
    }
  }, [])

  useEffect(() => {
    // 1. Register the service worker.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'FLUSH_VOTES') flushVotes()
      })
    }

    // 2. Flush queued votes when connectivity returns.
    const onOnline = () => flushVotes()
    window.addEventListener('online', onOnline)
    if (navigator.onLine) flushVotes()

    // 3. Install prompt handling.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true
    const dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    if (!standalone && !dismissed) {
      // iOS has no beforeinstallprompt — show the manual hint banner.
      if (ios) setShowBanner(true)
    }

    const onBIP = (e: BIPEvent) => {
      e.preventDefault()
      setInstallEvt(e)
      if (!standalone && !dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeinstallprompt', onBIP)
    }
  }, [flushVotes])

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
    dismiss()
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 inset-x-4 z-[60] mx-auto max-w-md md:hidden">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-3 animate-fade-in-up">
        <div className="w-10 h-10 rounded-xl bg-[#DC2626] flex items-center justify-center shrink-0">
          <Download size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">Install WéPollit</p>
          {isIOS && !installEvt ? (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
              Tap <Share size={11} className="inline" /> then &ldquo;Add to Home Screen&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access.</p>
          )}
        </div>
        {!isIOS && installEvt && (
          <button
            onClick={install}
            className="bg-primary text-white text-sm font-semibold px-4 min-h-[40px] rounded-full hover:bg-primary-dark active:scale-95 transition-all shrink-0"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
