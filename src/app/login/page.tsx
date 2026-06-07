'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart2, Eye, EyeOff, ArrowRight, RotateCcw,
  Mail, Phone, Globe,
} from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { analytics } from '@/lib/analytics'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Turnstile } from '@marsidev/react-turnstile'

type Tab       = 'social' | 'email' | 'phone'
type EmailStep = 'login' | 'signup' | 'forgot' | 'forgot-sent'
type PhoneStep = 'input' | 'otp'

function pwStrength(pw: string): { label: string; color: string; pct: number } {
  if (pw.length < 6) return { label: 'Too short', color: 'bg-red-400', pct: 15 }
  const has = (r: RegExp) => r.test(pw)
  const score = [pw.length >= 8, has(/[A-Z]/), has(/[0-9]/), has(/[^a-zA-Z0-9]/)]
    .filter(Boolean).length
  if (score <= 1) return { label: 'Weak',   color: 'bg-red-400',   pct: 30  }
  if (score === 2) return { label: 'Fair',   color: 'bg-amber-400', pct: 60  }
  return               { label: 'Strong', color: 'bg-green-500', pct: 100 }
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [tab,       setTab]       = useState<Tab>('social')
  const [emailStep, setEmailStep] = useState<EmailStep>('login')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [phone,     setPhone]     = useState<string | undefined>()
  const [otp,       setOtp]       = useState('')

  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')
  const [info,  setInfo]  = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  function reset() { setError(''); setInfo('') }

  function switchTab(t: Tab) { setTab(t); reset() }

  // ── Social ─────────────────────────────────────────────────────
  async function handleOAuth(provider: 'google' | 'facebook' | 'x') {
    setBusy(true); reset()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setBusy(false) }
  }

  // ── Email ──────────────────────────────────────────────────────
  async function handleEmailLogin() {
    setBusy(true); reset()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) { setError(error.message); return }
    analytics.userSignedIn('email')
    router.push('/')
  }

  async function handleEmailSignup() {
    if (password.length < 8)       { setError('Password must be at least 8 characters.'); return }
    if (password !== confirmPw)    { setError('Passwords do not match.'); return }
    setBusy(true); reset()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    if (data.session) {
      analytics.userSignedUp('email')
      router.push('/profile')
    } else {
      setInfo('Check your email to confirm your account, then sign in.')
      setEmailStep('login')
    }
  }

  async function handleForgot() {
    setBusy(true); reset()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setEmailStep('forgot-sent')
  }

  // ── Phone OTP ──────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!phone || !isValidPhoneNumber(phone)) {
      setError('Please enter a valid phone number.'); return
    }
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (siteKey) {
      if (!captchaToken) { setError('Please complete the security check.'); return }
      const captchaRes = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken }),
      })
      const captchaData = await captchaRes.json()
      if (!captchaData.success) {
        setError('Security check failed. Please try again.')
        setCaptchaToken('')
        return
      }
    }
    setBusy(true); reset()
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setBusy(false)
    if (error) { setError(error.message); return }
    setPhoneStep('otp')
  }

  async function handleVerifyOtp() {
    if (!phone) return
    setBusy(true); reset()
    const { error } = await supabase.auth.verifyOtp({
      phone, token: otp.trim(), type: 'sms',
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    analytics.userSignedIn('phone')
    router.push('/')
  }

  if (loading) return null

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
            <h1 className="text-2xl font-black">
              Welcome to{' '}
              <span className="text-foreground">WéPoll</span><span className="text-[#DC2626]">it</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to vote and create polls</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-muted rounded-xl p-1 mb-4 gap-1">
          {(
            [
              ['social', <Globe key="g" size={13} />,  'Social'],
              ['email',  <Mail  key="m" size={13} />,  'Email'],
              ['phone',  <Phone key="p" size={13} />,  'Phone'],
            ] as const
          ).map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-b from-card to-muted/40 border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4">

          {/* ── Social tab ─────────────────────────────────────── */}
          {tab === 'social' && (
            <>
              <button
                onClick={() => handleOAuth('google')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 border border-border rounded-xl px-4 min-h-[52px] text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>
              <button
                onClick={() => handleOAuth('facebook')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white rounded-xl px-4 min-h-[52px] text-sm font-semibold hover:bg-[#1466d4] active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <FacebookIcon /> Continue with Facebook
              </button>
              <button
                onClick={() => handleOAuth('x')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-3 bg-black text-white rounded-xl px-4 min-h-[52px] text-sm font-semibold hover:bg-zinc-800 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                <XIcon /> Continue with X
              </button>
            </>
          )}

          {/* ── Email tab ──────────────────────────────────────── */}
          {tab === 'email' && (
            <>
              {emailStep === 'login' && (
                <>
                  <Field label="Email">
                    <input
                      type="email" value={email} autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                        placeholder="••••••••"
                        className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                      />
                      <button
                        type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <button
                    onClick={handleEmailLogin}
                    disabled={busy || !email || !password}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {busy ? 'Signing in…' : 'Sign In'}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => { setEmailStep('forgot'); reset() }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                    <button
                      onClick={() => { setEmailStep('signup'); reset() }}
                      className="text-primary font-semibold hover:underline"
                    >
                      Sign Up
                    </button>
                  </div>
                </>
              )}

              {emailStep === 'signup' && (
                <>
                  <Field label="Email">
                    <input
                      type="email" value={email} autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </Field>
                  <Field label="Password">
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'} value={password} autoComplete="new-password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                      />
                      <button
                        type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {strength && password && (
                      <div className="mt-1.5 flex items-center gap-2">
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
                  </Field>
                  <Field label="Confirm Password">
                    <input
                      type={showPw ? 'text' : 'password'} value={confirmPw} autoComplete="new-password"
                      onChange={(e) => setConfirmPw(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailSignup()}
                      placeholder="Re-enter password"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </Field>
                  <button
                    onClick={handleEmailSignup}
                    disabled={busy || !email || !password || !confirmPw}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {busy ? 'Creating account…' : 'Create Account'}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                  <button
                    onClick={() => { setEmailStep('login'); reset() }}
                    className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Already have an account?{' '}
                    <span className="text-primary font-semibold">Sign In</span>
                  </button>
                </>
              )}

              {emailStep === 'forgot' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll send you a reset link.
                  </p>
                  <Field label="Email">
                    <input
                      type="email" value={email} autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleForgot()}
                      placeholder="you@example.com"
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                    />
                  </Field>
                  <button
                    onClick={handleForgot}
                    disabled={busy || !email}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {busy ? 'Sending…' : 'Send Reset Link'}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                  <button
                    onClick={() => { setEmailStep('login'); reset() }}
                    className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </>
              )}

              {emailStep === 'forgot-sent' && (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="text-4xl">📬</div>
                  <p className="font-bold text-foreground">Check your email</p>
                  <p className="text-sm text-muted-foreground">
                    We sent a reset link to <strong>{email}</strong>
                  </p>
                  <button
                    onClick={() => { setEmailStep('login'); reset() }}
                    className="text-sm text-primary font-semibold hover:underline mt-2"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Phone tab ──────────────────────────────────────── */}
          {tab === 'phone' && (
            <>
              {phoneStep === 'input' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Phone number
                    </label>
                    <div className="phone-input-wrapper border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                      <PhoneInput
                        international
                        defaultCountry="NG"
                        value={phone}
                        onChange={setPhone}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Select your country then enter your number.
                    </p>
                  </div>
                  {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onExpire={() => setCaptchaToken('')}
                      options={{ theme: 'auto' }}
                    />
                  )}
                  <button
                    onClick={handleSendOtp}
                    disabled={busy || !phone || !isValidPhoneNumber(phone ?? '')}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {busy ? 'Sending…' : 'Send OTP'}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                </>
              )}

              {phoneStep === 'otp' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <strong>{phone}</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">
                      Enter OTP
                    </label>
                    <input
                      type="text" inputMode="numeric" value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      placeholder="123456"
                      className="w-full border border-border rounded-xl px-4 py-3.5 text-xl font-bold text-center tracking-[0.4em] bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground placeholder:tracking-normal"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={busy || otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold min-h-[52px] rounded-xl hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-60"
                  >
                    {busy ? 'Verifying…' : 'Verify OTP'}
                    {!busy && <ArrowRight size={15} />}
                  </button>
                  <button
                    onClick={() => { setPhoneStep('input'); setOtp(''); reset() }}
                    className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                  >
                    <RotateCcw size={12} /> Resend / change number
                  </button>
                </>
              )}
            </>
          )}

          {/* Error / info banners */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {info}
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to WéPollit's Terms of Service.
        </p>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
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

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}