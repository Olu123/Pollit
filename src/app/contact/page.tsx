'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Send } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'

const SUBJECTS = [
  'General Enquiry', 'Report a Problem', 'Partnership / Advertising',
  'Media Enquiry', 'Account Issue', 'Feedback & Suggestions',
  'Token / Rewards Query', 'Other',
]
const MAX = 1000
const MIN = 20

export default function ContactPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { lang } = useLanguage()
  const en = lang === 'en'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const username = profile?.username ?? ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || message.trim().length < MIN) {
      setError(en ? `Please fill all fields (message at least ${MIN} characters).` : `Abeg fill everything (message no less than ${MIN} characters).`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(), subject,
          message: message.trim(), username, userId: user?.id ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || (en ? 'Something went wrong. Please try again.' : 'Something do am. Try again.'))
        setBusy(false)
        return
      }
      setSent(true)
    } catch {
      setError(en ? 'Something went wrong. Please try again.' : 'Something do am. Try again.')
    }
    setBusy(false)
  }

  function reset() {
    setSent(false)
    setName('')
    setEmail('')
    setSubject(SUBJECTS[0])
    setMessage('')
    setError('')
  }

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center animate-fade-in-up">
          <CheckCircle2 size={44} className="text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-foreground">{en ? 'Message Sent! ✅' : 'Message don go! ✅'}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {en
            ? "Thank you for reaching out. We'll get back to you within 48 hours."
            : 'Thank you for writing us. We go reply you within 48 hours.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
          <Link href="/" className="flex-1 inline-flex items-center justify-center bg-muted text-foreground text-sm font-semibold min-h-[48px] rounded-xl hover:bg-border transition-colors">
            {en ? 'Back to Home' : 'Go Home'}
          </Link>
          <button onClick={reset} className="flex-1 inline-flex items-center justify-center bg-primary text-white text-sm font-semibold min-h-[48px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all">
            {en ? 'Send Another Message' : 'Send Another One'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">{en ? 'Contact Us' : 'Talk To Us'}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {en
            ? "We'd love to hear from you. Send us a message and we'll get back to you as soon as possible."
            : 'Talk to us. Send message, we go reply you sharp sharp.'}
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Full Name' : 'Full Name'} <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={en ? 'Your full name' : 'Your full name'}
            maxLength={120}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[48px]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Email Address' : 'Email Address'} <span className="text-red-500">*</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            maxLength={160}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[48px]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Subject' : 'Subject'} <span className="text-red-500">*</span></label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[48px] appearance-none"
          >
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Message' : 'Message'} <span className="text-red-500">*</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder={en ? "Tell us what's on your mind..." : 'Talk your mind here...'}
            rows={5}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
            {message.length}/{MAX}{message.length < MIN ? ` · min ${MIN}` : ''}
          </p>
        </div>

        {user && username && (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Username' : 'Username'}</label>
            <input
              value={`@${username}`}
              readOnly
              className="w-full border border-border rounded-xl px-4 py-3 text-base bg-muted/50 text-muted-foreground outline-none min-h-[48px]"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {busy
            ? <><Loader2 size={17} className="animate-spin" /> {en ? 'Sending...' : 'Dey send...'}</>
            : <><Send size={16} /> {en ? 'Send Message 🚀' : 'Send Am 🚀'}</>}
        </button>
      </form>
    </main>
  )
}
