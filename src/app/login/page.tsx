'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BarChart2, Phone, ArrowRight, RotateCcw } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

type Step = 'choose' | 'phone' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [step, setStep]   = useState<Step>('choose')
  const [phone, setPhone] = useState('')
  const [otp, setOtp]     = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  function normalizePhone(raw: string) {
    const d = raw.replace(/\D/g, '')
    if (d.startsWith('234')) return `+${d}`
    if (d.startsWith('0'))   return `+234${d.slice(1)}`
    return `+234${d}`
  }

  async function handleGoogle() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setBusy(false) }
  }

  async function handleSendOtp() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) })
    if (error) { setError(error.message); setBusy(false) }
    else { setStep('otp'); setBusy(false) }
  }

  async function handleVerifyOtp() {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otp.trim(),
      type: 'sms',
    })
    if (error) { setError(error.message); setBusy(false) }
    else router.push('/')
  }

  if (loading) return null

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <BarChart2 size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">Welcome to Agora</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to vote and create polls</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          {step === 'choose' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 border border-border rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full flex items-center justify-center gap-3 bg-muted rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-border transition-colors"
              >
                <Phone size={16} strokeWidth={2} />
                Continue with Phone (OTP)
              </button>
            </>
          )}

          {step === 'phone' && (
            <>
              <button
                onClick={() => { setStep('choose'); setError('') }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors -mt-1 mb-1"
              >
                ← Back
              </button>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Phone number
                </label>
                <div className="flex items-center gap-2 border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                  <span className="pl-3 text-sm text-muted-foreground font-medium shrink-0">🇳🇬 +234</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="8012345678"
                    className="flex-1 py-3 pr-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Enter your number with or without the leading 0.
                </p>
              </div>
              <button
                onClick={handleSendOtp}
                disabled={busy || phone.replace(/\D/g, '').length < 7}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send OTP'}
                {!busy && <ArrowRight size={15} />}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  We sent a 6-digit code to <strong>{normalizePhone(phone)}</strong>
                </p>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full border border-border rounded-xl px-4 py-3 text-lg font-bold text-center tracking-[0.4em] bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground placeholder:tracking-normal"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                />
              </div>
              <button
                onClick={handleVerifyOtp}
                disabled={busy || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {busy ? 'Verifying…' : 'Verify OTP'}
                {!busy && <ArrowRight size={15} />}
              </button>
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={11} /> Resend / change number
              </button>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to Agora&rsquo;s Terms of Service.
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
