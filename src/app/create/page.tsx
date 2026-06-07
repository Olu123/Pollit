'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Loader2, Users2, Trophy } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import type { PollCategory } from '@/lib/types'
import type { StringKey } from '@/lib/i18n'
import { sanitizePollQuestion, sanitizePollOption } from '@/lib/sanitize'
import { Turnstile } from '@marsidev/react-turnstile'

const HOT_TAKE_MIN_TOKENS = 100

function genCommunityCode() {
  const letters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'
  const alnum = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('')
  return `${pick(letters, 3)}-${pick(alnum, 3)}`
}

const CATEGORIES: PollCategory[] = [
  'Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle',
]

const EXPIRY_OPTIONS = [
  { label: '24 hours', days: 1 },
  { label: '3 days',   days: 3 },
  { label: '7 days',   days: 7 },
  { label: '30 days',  days: 30 },
]

const CATEGORY_STYLES: Record<PollCategory, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

const STEP_KEYS: StringKey[] = ['create.step1', 'create.step2', 'create.step3']

export default function CreatePollPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const { t } = useLanguage()

  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<PollCategory>('Politics')
  const [options, setOptions]   = useState(['', ''])
  const [expiryDays, setExpiry] = useState(7)
  const [isHotTake, setHotTake] = useState(false)
  const [isCommunity, setCommunity] = useState(false)
  const [communityName, setCommunityName] = useState('')
  const [communityCode, setCommunityCode] = useState('')
  const [communityPassword, setCommunityPassword] = useState('')
  const [isChallenge, setChallenge] = useState(false)
  const [challengePool, setChallengePool] = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  const canHotTake = (profile?.points ?? 0) >= HOT_TAKE_MIN_TOKENS
  const isAdmin = !!profile?.is_admin
  const poolNum = Math.max(0, Math.floor(Number(challengePool) || 0))

  function toggleCommunity() {
    setCommunity((v) => {
      const next = !v
      if (next && !communityCode) setCommunityCode(genCommunityCode())
      return next
    })
  }

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)))
  }

  function addOption() {
    if (options.length < 6) setOptions((p) => [...p, ''])
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions((p) => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmed = options.map((o) => sanitizePollOption(o)).filter(Boolean)
    const cleanQuestion = sanitizePollQuestion(question)
    if (!cleanQuestion)      return setError('Please enter a question.')
    if (cleanQuestion.length < 10) return setError('Question must be at least 10 characters.')
    if (trimmed.length < 2)  return setError('Please fill in at least 2 options.')

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

    setBusy(true)
    const makeChallenge = isAdmin && isChallenge && !isCommunity
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString()

    const { data: pollId, error: rpcError } = await supabase.rpc('create_poll', {
      p_question:    cleanQuestion,
      p_category:    category,
      p_options:     trimmed,
      p_expires_at:  expiresAt,
      p_is_hot_take: canHotTake && isHotTake && !isCommunity && !makeChallenge,
      p_is_community: isCommunity,
      p_community_name: isCommunity ? communityName.trim() || null : null,
      p_community_code: isCommunity ? communityCode : null,
      p_community_password: isCommunity ? communityPassword.trim() || null : null,
      p_is_challenge: makeChallenge,
      p_challenge_pool: makeChallenge ? poolNum : 0,
    })

    if (rpcError) {
      setError(
        rpcError.message.includes('daily_poll_limit_reached')
          ? "You've reached your daily limit of 5 polls. Come back tomorrow!"
          : rpcError.message
      )
      setBusy(false)
      return
    }
    if (isCommunity && communityCode) {
      router.push(`/polls/${pollId}?code=${communityCode}`)
    } else {
      router.push(`/polls/${pollId}`)
    }
  }

  const filledOptions = options.map((o) => o.trim()).filter(Boolean)
  const step = !question.trim() ? 1 : filledOptions.length < 2 ? 2 : 3

  if (loading || !user) return null

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">{t('create.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          {t('create.subtitlePre')} <span className="text-primary font-semibold">+30 tokens</span> {t('create.subtitlePost')}
        </p>
      </div>

      <StepIndicator current={step} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            {t('create.question')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('create.questionPlaceholder')}
            rows={3}
            maxLength={280}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{question.length}/280</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{t('create.category')}</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors min-h-[44px] ${
                  category === cat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
                }`}
              >
                {t(`cat.${cat}` as StringKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Hot Take toggle */}
        {canHotTake && (
          <button
            type="button"
            onClick={() => setHotTake((v) => !v)}
            aria-pressed={isHotTake}
            className={`flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              isHotTake ? 'border-[#DC2626] bg-[#DC2626]/5' : 'border-border hover:border-[#DC2626]/40'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <span className={isHotTake ? 'animate-flame' : ''}>🔥</span> {t('create.hotTake')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('create.hotTakeSub')}</p>
            </div>
            <span
              className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${isHotTake ? 'bg-[#DC2626]' : 'bg-muted'}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${isHotTake ? 'translate-x-5' : ''}`} />
            </span>
          </button>
        )}

        {/* Challenge toggle — admin only */}
        {isAdmin && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setChallenge((v) => !v)}
              aria-pressed={isChallenge}
              className={`flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                isChallenge ? 'border-amber-500 bg-amber-50' : 'border-border hover:border-amber-500/40'
              }`}
            >
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Trophy size={15} className="text-amber-500" /> {t('challenge.toggle')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('challenge.toggleSub')}</p>
              </div>
              <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${isChallenge ? 'bg-amber-500' : 'bg-muted'}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${isChallenge ? 'translate-x-5' : ''}`} />
              </span>
            </button>

            {isChallenge && (
              <div className="flex flex-col gap-2 pl-1">
                <label className="block text-sm font-semibold text-foreground">{t('challenge.poolLabel')}</label>
                <div className="flex items-center gap-2 border border-border rounded-xl px-4 min-h-[44px] focus-within:ring-2 focus-within:ring-amber-400">
                  <Trophy size={15} className="text-amber-500 shrink-0" />
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={challengePool}
                    onChange={(e) => setChallengePool(e.target.value)}
                    placeholder="e.g. 5000"
                    className="flex-1 bg-transparent text-base outline-none py-2.5 tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">{t('challenge.tokens')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('challenge.poolHint')}</p>
                {poolNum > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-amber-700">{t('challenge.estReward')}</p>
                    <p className="text-lg font-black text-amber-700 tabular-nums">
                      ≈ {Math.floor(poolNum / 50).toLocaleString()} {t('challenge.tokens')}
                    </p>
                    <p className="text-xs text-amber-700/80">{t('challenge.estRewardSub')} · if 50 join</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Community poll toggle */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={toggleCommunity}
            aria-pressed={isCommunity}
            className={`flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all ${
              isCommunity ? 'border-primary bg-primary-light/40' : 'border-border hover:border-primary/40'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users2 size={15} /> Make this a Community Poll 🏘️
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Private — only people with the invite code can vote.</p>
            </div>
            <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${isCommunity ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${isCommunity ? 'translate-x-5' : ''}`} />
            </span>
          </button>

          {isCommunity && (
            <div className="flex flex-col gap-3 pl-1">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Community name</label>
                <input
                  type="text"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="e.g. Lagos Landlords Association"
                  maxLength={80}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Invite code</p>
                  <p className="text-lg font-black tracking-wider text-foreground">{communityCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommunityCode(genCommunityCode())}
                  className="text-xs font-semibold text-primary hover:text-primary-dark px-3 min-h-[40px] rounded-full hover:bg-primary-light transition-colors"
                >
                  Regenerate
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Password <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={communityPassword}
                  onChange={(e) => setCommunityPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  maxLength={40}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            {t('create.options')} <span className="text-muted-foreground font-normal">(2–6)</span>
          </label>
          <div className="flex flex-col gap-2.5">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 animate-fade-in-up">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center select-none">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`${t('create.options')} ${i + 1}`}
                  maxLength={120}
                  className="flex-1 border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-red-500 active:text-red-600 transition-colors rounded-xl hover:bg-red-50 shrink-0"
                    aria-label="Remove option"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-semibold transition-colors py-1"
            >
              <Plus size={15} strokeWidth={2.5} /> {t('create.addOption')}
            </button>
          )}
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            {t('create.duration')}
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {EXPIRY_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                type="button"
                onClick={() => setExpiry(days)}
                className={`shrink-0 text-sm font-semibold px-4 py-2.5 rounded-full transition-colors min-h-[44px] ${
                  expiryDays === days
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">{t('create.preview')}</label>
          <PreviewCard question={question} category={category} options={filledOptions} expiryDays={expiryDays} isHotTake={canHotTake && isHotTake} />
        </div>

        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            onSuccess={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken('')}
            options={{ theme: 'auto' }}
          />
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="sticky bottom-4 sm:static z-10">
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60 min-h-[56px] shadow-lg shadow-primary/20 sm:shadow-none"
          >
            {busy ? (
              <><Loader2 size={17} className="animate-spin" /> {t('create.publishing')}</>
            ) : (
              `${t('create.publish')} (+30 tokens)`
            )}
          </button>
        </div>
      </form>
    </main>
  )
}

function StepIndicator({ current }: { current: number }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center mb-6">
      {STEP_KEYS.map((key, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done || active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {t(key)}
              </span>
            </div>
            {n < STEP_KEYS.length && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PreviewCard({
  question, category, options, expiryDays, isHotTake,
}: {
  question: string
  category: PollCategory
  options: string[]
  expiryDays: number
  isHotTake: boolean
}) {
  const { t } = useLanguage()
  const opts = options.length ? options : ['Option 1', 'Option 2']
  const empty = options.length === 0
  return (
    <div className={`rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${isHotTake ? 'bg-gray-900 border-gray-800' : 'bg-card border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isHotTake ? 'bg-[#DC2626] text-white' : CATEGORY_STYLES[category]}`}>
          {isHotTake ? <span className="inline-flex items-center gap-1"><span className="animate-flame">🔥</span> {t(`cat.${category}` as StringKey)}</span> : t(`cat.${category}` as StringKey)}
        </span>
        <span className={`text-xs ${isHotTake ? 'text-gray-400' : 'text-muted-foreground'}`}>{expiryDays}d {t('card.left')}</span>
      </div>
      <h3 className={`font-bold text-[15px] leading-snug ${isHotTake ? 'text-white' : question.trim() ? 'text-foreground' : 'text-muted-foreground italic'}`}>
        {question.trim() || 'Your question will appear here…'}
      </h3>
      <div className={`flex flex-col gap-2 ${empty ? 'opacity-50' : ''}`}>
        {opts.slice(0, 2).map((o, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/75 truncate">{o}</span>
              <span className="font-semibold text-muted-foreground">0%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '0%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}