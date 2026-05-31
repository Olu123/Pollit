'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useLanguage } from '@/components/LanguageProvider'
import MyNigeriaCard from '@/components/MyNigeriaCard'
import {
  Loader2, Save, Star, BarChart2, CheckSquare, Lock, Mail, CheckCircle2, Pencil, X,
} from 'lucide-react'
import type { PollCategory } from '@/lib/types'

const AGE_RANGES = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+']
const SEX_OPTIONS = ['Male', 'Female', 'Prefer not to say']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const MAX_BIO = 160

const AVATAR_PALETTE = [
  '#16a34a', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#0891b2', '#be185d', '#0d9488',
]
function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

interface RecentPoll {
  id: string
  question: string
  category: PollCategory
  total_votes: number
  created_at: string
}

interface Stats {
  points: number
  pollsCreated: number
  votesCast: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useLanguage()

  const [ready, setReady]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [saved, setSaved]   = useState(false)
  const [editing, setEditing] = useState(false)

  // Editable fields
  const [username, setUsername]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [ageRange, setAgeRange]   = useState('')
  const [sex, setSex]             = useState('')
  const [birthMonth, setMonth]    = useState('')
  const [birthDay, setDay]        = useState('')
  const [phone, setPhone]         = useState('')
  const [bio, setBio]             = useState('')

  // Read-only / derived
  const [stats, setStats]   = useState<Stats>({ points: 0, pollsCreated: 0, votesCast: 0 })
  const [recent, setRecent] = useState<RecentPoll[]>([])

  const email = user?.email ?? user?.phone ?? '—'

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const loadAll = useCallback(async () => {
    if (!user) return

    const [{ data: profile }, polls, votes, { data: recentPolls }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('polls').select('id', { count: 'exact', head: true }).eq('created_by', user.id).is('deleted_at', null),
      supabase.from('votes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase
        .from('polls')
        .select('id, question, category, total_votes, created_at')
        .eq('created_by', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (profile) {
      setUsername(profile.username ?? '')
      setFullName(profile.full_name ?? '')
      setAgeRange(profile.age_range ?? '')
      setSex(profile.sex ?? '')
      setMonth(profile.birth_month ? String(profile.birth_month) : '')
      setDay(profile.birth_day ? String(profile.birth_day) : '')
      setPhone(profile.phone ?? '')
      setBio(profile.bio ?? '')
      setStats({
        points:       profile.points ?? 0,
        pollsCreated: polls.count ?? 0,
        votesCast:    votes.count ?? 0,
      })
    }
    setRecent((recentPolls ?? []) as RecentPoll[])
    setReady(true)
  }, [user])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (!username.trim()) {
      setError('Username is required.')
      return
    }

    setSaving(true)
    const { error: updErr } = await supabase
      .from('profiles')
      .update({
        username:    username.trim(),
        full_name:   fullName.trim() || null,
        age_range:   ageRange || null,
        sex:         sex || null,
        birth_month: birthMonth ? Number(birthMonth) : null,
        birth_day:   birthDay ? Number(birthDay) : null,
        phone:       phone.trim() || null,
        bio:         bio.trim() || null,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', user!.id)

    if (updErr) {
      setError(
        updErr.code === '23505'
          ? 'That username is already taken. Try another.'
          : updErr.message
      )
      setSaving(false)
      return
    }

    setSaving(false)
    setSaved(true)
    setEditing(false)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading || !user || !ready) {
    return (
      <main className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
      </main>
    )
  }

  const initials = username ? username.slice(0, 2).toUpperCase() : '?'

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
      {/* Cover photo + overlapping avatar */}
      <div>
        <div className="h-28 sm:h-32 rounded-xl bg-gradient-to-br from-[#DC2626] via-[#e23b3b] to-[#b91c1c] shadow-sm" />
        <div className="flex items-end gap-4 -mt-10 px-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black shrink-0 select-none ring-4 ring-background"
            style={{ backgroundColor: avatarColor(user.id) }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="text-xl sm:text-2xl font-black text-foreground truncate">
              {username ? `@${username}` : 'Your profile'}
            </h1>
            <p className="text-sm text-muted-foreground">{t('profile.manage')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Star}       label={t('profile.statTokens')} value={stats.points} />
        <StatCard icon={BarChart2}  label={t('profile.statPolls')}  value={stats.pollsCreated} />
        <StatCard icon={CheckSquare} label={t('profile.statVotes')} value={stats.votesCast} />
      </div>

      {/* My Nigeria shareable card */}
      <MyNigeriaCard />

      {/* Profile details — view / edit toggle */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">{t('profile.details')}</h2>
          {editing ? (
            <button
              type="button"
              onClick={() => { setEditing(false); setError(''); loadAll() }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground px-3 min-h-[40px] rounded-full hover:bg-muted transition-colors"
            >
              <X size={15} /> {t('profile.cancel')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark px-3 min-h-[40px] rounded-full hover:bg-primary-light transition-colors"
            >
              <Pencil size={14} /> {t('profile.edit')}
            </button>
          )}
        </div>

        <fieldset disabled={!editing} className="contents">

        {/* Username */}
        <Field label={t('profile.username')} required hint={t('profile.usernameHint')}>
          <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary">
            <span className="pl-3 text-base text-muted-foreground select-none">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder="lagos_boy"
              maxLength={30}
              className="flex-1 py-3 px-2 text-base bg-transparent outline-none placeholder:text-muted-foreground min-h-[44px]"
            />
          </div>
        </Field>

        {/* Full name (private) */}
        <Field
          label={t('profile.fullName')}
          hint={<span className="inline-flex items-center gap-1"><Lock size={11} /> {t('profile.fullNameHint')}</span>}
        >
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Adebayo Okafor"
            maxLength={80}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
          />
        </Field>

        {/* Age range + Sex */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('profile.ageRange')}>
            <Select value={ageRange} onChange={setAgeRange} placeholder={t('profile.select')}>
              {AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label={t('profile.sex')}>
            <Select value={sex} onChange={setSex} placeholder={t('profile.select')}>
              {SEX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>

        {/* Birthday (month + day, no year) */}
        <Field label={t('profile.birthday')} hint={t('profile.birthdayHint')}>
          <div className="grid grid-cols-2 gap-4">
            <Select value={birthMonth} onChange={setMonth} placeholder={t('profile.month')}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
            <Select value={birthDay} onChange={setDay} placeholder={t('profile.day')}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
        </Field>

        {/* Email (read-only) */}
        <Field label={t('profile.email')} hint={t('profile.emailHint')}>
          <div className="flex items-center gap-2 border border-border rounded-xl px-4 py-3 bg-muted/50 min-h-[44px]">
            <Mail size={15} className="text-muted-foreground shrink-0" />
            <span className="text-base text-muted-foreground truncate">{email}</span>
          </div>
        </Field>

        {/* Phone */}
        <Field label={t('profile.phone')}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 08012345678"
            maxLength={20}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground min-h-[44px]"
          />
        </Field>

        {/* Bio */}
        <Field label={t('profile.bio')}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder={t('profile.bioPlaceholder')}
            rows={3}
            maxLength={MAX_BIO}
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">{bio.length}/{MAX_BIO}</p>
        </Field>

        </fieldset>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}
        {saved && (
          <p className="flex items-center gap-2 text-sm text-primary bg-primary-light rounded-xl px-4 py-3 font-semibold">
            <CheckCircle2 size={16} strokeWidth={2.5} /> {t('profile.saved')}
          </p>
        )}

        {editing && (
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? <><Loader2 size={17} className="animate-spin" /> {t('profile.saving')}</> : <><Save size={17} /> {t('profile.save')}</>}
          </button>
        )}
      </form>

      {/* Recent activity */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">{t('profile.recent')}</h2>
        {recent.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">{t('profile.noRecent')}</p>
            <Link
              href="/create"
              className="mt-3 inline-flex items-center bg-primary text-white text-sm font-semibold px-5 min-h-[44px] rounded-full hover:bg-primary-dark active:scale-95 transition-all"
            >
              {t('profile.firstPoll')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((p) => (
              <Link
                key={p.id}
                href={`/polls/${p.id}`}
                className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.category} · {p.total_votes.toLocaleString()} vote{p.total_votes !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-xs text-primary font-semibold shrink-0">View →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ── Small presentational helpers ──────────────────────────────

function StatCard({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  const display = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex flex-col items-center gap-1 text-center">
      <Icon size={18} className="text-primary" strokeWidth={2.5} />
      <span className="text-xl font-black text-foreground tabular-nums leading-none">{display}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Field({
  label, required, hint, children,
}: {
  label: string
  required?: boolean
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function Select({
  value, onChange, placeholder, children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent outline-none focus:ring-2 focus:ring-primary min-h-[44px] appearance-none"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}
