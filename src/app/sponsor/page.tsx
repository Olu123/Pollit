'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, Send, Check, Sparkles, Star, Crown } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import { sanitizeText } from '@/lib/sanitize'

type TierId = '₦50,000' | '₦200,000' | '₦500,000'

interface Tier {
  id: TierId
  name: { en: string; pid: string }
  price: string
  period: { en: string; pid: string }
  icon: typeof Sparkles
  highlight?: boolean
  perks: { en: string; pid: string }[]
}

const TIERS: Tier[] = [
  {
    id: '₦50,000',
    name: { en: 'Supporter', pid: 'Supporter' },
    price: '₦50,000',
    period: { en: 'per month', pid: 'every month' },
    icon: Sparkles,
    perks: [
      { en: 'Logo on our sponsors page', pid: 'Your logo for our sponsors page' },
      { en: 'A shout-out post on our channels', pid: 'We go hail you for our channels' },
      { en: 'Monthly poll insights digest', pid: 'Monthly poll insights for your mail' },
    ],
  },
  {
    id: '₦200,000',
    name: { en: 'Partner', pid: 'Partner' },
    price: '₦200,000',
    period: { en: 'per month', pid: 'every month' },
    icon: Star,
    highlight: true,
    perks: [
      { en: 'Everything in Supporter', pid: 'Everything for Supporter' },
      { en: 'One sponsored poll each month', pid: 'One sponsored poll every month' },
      { en: 'Logo on the home page', pid: 'Your logo for the home page' },
      { en: 'Branded result cards', pid: 'Result cards with your brand' },
    ],
  },
  {
    id: '₦500,000',
    name: { en: 'Headline', pid: 'Headline' },
    price: '₦500,000',
    period: { en: 'per month', pid: 'every month' },
    icon: Crown,
    perks: [
      { en: 'Everything in Partner', pid: 'Everything for Partner' },
      { en: 'Weekly sponsored polls', pid: 'Sponsored polls every week' },
      { en: 'Featured Challenge with a token pool', pid: 'Featured Challenge with token pool' },
      { en: 'Custom Pulse report for your brand', pid: 'Custom Pulse report for your brand' },
      { en: 'Priority support', pid: 'Priority support' },
    ],
  },
]

const MAX = 1000
const MIN = 20

export default function SponsorPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const en = lang !== 'pid' // Hausa falls back to English copy on this page

  const [tier, setTier] = useState<TierId>('₦200,000')
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [org, setOrg] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || message.trim().length < MIN) {
      setError(en ? `Please fill all required fields (message at least ${MIN} characters).` : `Abeg fill everything (message no less than ${MIN} characters).`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sanitizeText(name),
          email: email.trim(),
          org: sanitizeText(org),
          tier,
          message: sanitizeText(message),
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

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center animate-fade-in-up">
          <CheckCircle2 size={44} className="text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-black text-foreground">{en ? 'Thank you! ✅' : 'Thank you! ✅'}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {en
            ? "We've received your sponsorship enquiry and will get back to you within 48 hours."
            : 'We don receive your sponsorship message. We go reply you within 48 hours.'}
        </p>
        <Link href="/" className="mt-2 inline-flex items-center justify-center bg-primary text-white text-sm font-semibold px-6 min-h-[48px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all">
          {en ? 'Back to Home' : 'Go Home'}
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
      <header className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          {en ? 'Sponsor WePollit 🇳🇬' : 'Sponsor WePollit 🇳🇬'}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {en
            ? 'Put your brand in front of thousands of engaged Nigerians having their say every day. Pick a tier and reach out — we tailor every partnership.'
            : 'Put your brand in front of plenty Naija people wey dey vote every day. Choose tier, then reach us — we go arrange am for you.'}
        </p>
      </header>

      {/* Tier cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tr) => {
          const Icon = tr.icon
          const selected = tier === tr.id
          return (
            <button
              key={tr.id}
              type="button"
              onClick={() => setTier(tr.id)}
              aria-pressed={selected}
              className={`relative flex flex-col gap-3 text-left rounded-2xl border-2 p-5 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected
                  ? 'border-primary bg-primary-light/40 shadow-sm'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {tr.highlight && (
                <span className="absolute -top-2.5 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                  {en ? 'Popular' : 'Popular'}
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Icon size={17} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">{en ? tr.name.en : tr.name.pid}</p>
                  <p className="text-xs text-muted-foreground">{en ? tr.period.en : tr.period.pid}</p>
                </div>
                {selected && <CheckCircle2 size={18} className="ml-auto text-primary shrink-0" strokeWidth={2.5} />}
              </div>
              <p className="text-2xl font-black text-foreground">{tr.price}</p>
              <ul className="flex flex-col gap-2 mt-1">
                {tr.perks.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-snug">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{en ? p.en : p.pid}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Enquiry form */}
      <section className="bg-card border border-border rounded-2xl p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-black text-foreground">{en ? 'Get in touch' : 'Talk to us'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {en
              ? <>Tell us about your goals. Selected tier: <strong className="text-foreground">{tier}</strong>.</>
              : <>Tell us wetin you want. Tier wey you choose: <strong className="text-foreground">{tier}</strong>.</>}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
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
              <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Organisation' : 'Company / Brand'}</label>
              <input
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder={en ? 'Company or brand (optional)' : 'Company or brand (optional)'}
                maxLength={120}
                className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[48px]"
              />
            </div>
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
            <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Sponsorship Tier' : 'Sponsorship Tier'} <span className="text-red-500">*</span></label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as TierId)}
              className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[48px] appearance-none"
            >
              {TIERS.map((tr) => (
                <option key={tr.id} value={tr.id}>{`${tr.price} — ${en ? tr.name.en : tr.name.pid}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">{en ? 'Message' : 'Message'} <span className="text-red-500">*</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
              placeholder={en ? 'Tell us about your brand and what you want to achieve...' : 'Tell us about your brand and wetin you wan achieve...'}
              rows={5}
              className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
              {message.length}/{MAX}{message.length < MIN ? ` · min ${MIN}` : ''}
            </p>
          </div>

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
              : <><Send size={16} /> {en ? 'Send Enquiry 🚀' : 'Send Am 🚀'}</>}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            {en ? 'Prefer email? Reach us at ' : 'You fit email us for '}
            <a href="mailto:hello@wepollit.com" className="text-primary font-semibold hover:underline">hello@wepollit.com</a>
          </p>
        </form>
      </section>
    </main>
  )
}
