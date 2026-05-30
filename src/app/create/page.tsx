'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import type { PollCategory } from '@/lib/types'

const CATEGORIES: PollCategory[] = [
  'Politics', 'Sports', 'Entertainment', 'Business', 'Lifestyle',
]

const EXPIRY_OPTIONS = [
  { label: '24 hours', days: 1 },
  { label: '3 days',   days: 3 },
  { label: '7 days',   days: 7 },
  { label: '30 days',  days: 30 },
]

export default function CreatePollPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState<PollCategory>('Politics')
  const [options, setOptions]   = useState(['', ''])
  const [expiryDays, setExpiry] = useState(7)
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState('')

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

    const trimmed = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim())   return setError('Please enter a question.')
    if (trimmed.length < 2) return setError('Please fill in at least 2 options.')

    setBusy(true)
    const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString()

    const { data: pollId, error: rpcError } = await supabase.rpc('create_poll', {
      p_question:   question.trim(),
      p_category:   category,
      p_options:    trimmed,
      p_expires_at: expiresAt,
    })

    if (rpcError) { setError(rpcError.message); setBusy(false); return }
    router.push(`/polls/${pollId}`)
  }

  if (loading || !user) return null

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground">Create a Poll</h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          Ask Nigeria. Earn <span className="text-primary font-semibold">+50 points</span> for creating a poll.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Question */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Poll question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Who will win the 2027 election?"
            rows={3}
            maxLength={280}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{question.length}/280</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                  category === cat
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-border hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Options <span className="text-muted-foreground font-normal">(2–6)</span>
          </label>
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={120}
                  className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="Remove option"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark font-semibold transition-colors"
            >
              <Plus size={15} strokeWidth={2.5} /> Add option
            </button>
          )}
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">
            Poll duration
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                type="button"
                onClick={() => setExpiry(days)}
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-3.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
        >
          {busy ? (
            <><Loader2 size={17} className="animate-spin" /> Publishing…</>
          ) : (
            'Publish Poll (+50 pts)'
          )}
        </button>
      </form>
    </main>
  )
}
