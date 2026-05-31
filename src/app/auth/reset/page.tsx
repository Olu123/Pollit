'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BarChart2, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

function pwStrength(pw: string): { label: string; color: string; pct: number } {
  if (pw.length < 6) return { label: 'Too short', color: 'bg-red-400', pct: 15 }
  const has = (r: RegExp) => r.test(pw)
  const score = [pw.length >= 8, has(/[A-Z]/), has(/[0-9]/), has(/[^a-zA-Z0-9]/)]
    .filter(Boolean).length
  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',   pct: 30  }
  if (score === 2) return { label: 'Fair',   color: 'bg-amber-400', pct: 60  }
  return               { label: 'Strong', color: 'bg-green-500', pct: 100 }
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [password,  setPassword]  = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  // No session = arrived here directly without a reset link → send to login
  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  async function handleReset() {
    if (password.length < 8)    { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw) { setError('Passwords do not match.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2000)
  }

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </main>
    )
  }

  const strength = password ? pwStrength(password) : null

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#DC2626] to-[#b91c1c] rounded-3xl flex items-center justify-center shadow-xl shadow-[#DC2626]/20">
            <BarChart2 size={40} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Choose a strong password for your account</p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-card to-muted/40 border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-4xl">✅</div>
              <p className="font-bold text-foreground">Password updated!</p>
              <p className="text-sm text-muted-foreground">Redirecting you home…</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {strength && password && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength.color}`}
                        style={{ width: `${strength.pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      strength.pct === 100 ? 'text-green-600'
                      : strength.pct >= 60  ? 'text-amber-600'
                      : 'text-red-500'
                    }`}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-foreground">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleReset}
                disabled={busy || !password || !confirmPw}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {busy ? 'Updating…' : 'Update Password'}
                {!busy && <ArrowRight size={15} />}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
