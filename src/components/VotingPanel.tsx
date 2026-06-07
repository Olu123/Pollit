'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Users, Clock, CheckCircle2, Loader2, Star, MessageCircle, MapPin, Pencil, Lock, RefreshCw, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Poll, PollOption, PollComment } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'
import { useToast } from './ToastProvider'
import ReportButton from './ReportButton'
import { enqueueVote } from '@/lib/voteQueue'
import { NIGERIAN_STATES } from '@/lib/states'
import { getInsight } from '@/lib/insights'
import { shareMessages, whatsappHref } from '@/lib/share'
import { sanitizeComment } from '@/lib/sanitize'

function timeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h left`
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function fmtVotes(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const AVATAR_PALETTE = [
  '#16a34a', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#0891b2', '#be185d', '#0d9488',
]

function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

const CATEGORY_STYLES: Record<string, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

const MAX_COMMENT = 280

export default function VotingPanel({ poll: initialPoll }: { poll: Poll }) {
  const { user, profile } = useAuth()
  const { t, lang } = useLanguage()
  const { showToast } = useToast()

  const [poll, setPoll]            = useState(initialPoll)
  const [votedOptionId, setVoted]  = useState<string | null>(null)
  const [votedChecked, setChecked] = useState(false)
  const [selectedId, setSelected]  = useState<string | null>(null)
  const [comment, setComment]      = useState('')
  const [voteState, setVoteState]  = useState('')
  const [voting, setVoting]        = useState(false)
  const [voteError, setVoteError]  = useState('')
  const [comments, setComments]    = useState<PollComment[]>([])
  const [revealing, setRevealing]  = useState(false)
  const [insight, setInsight]      = useState('')
  const [justJoined, setJustJoined] = useState(false)

  const isChallenge = !!poll.is_challenge

  // Edit window + vote-change window
  const [nowTs, setNowTs]          = useState(() => Date.now())
  const [votedAt, setVotedAt]      = useState<number | null>(null)
  const [editing, setEditing]      = useState(false)
  const [editQuestion, setEditQuestion] = useState(initialPoll.question)
  const [editOpts, setEditOpts]    = useState(initialPoll.options.map((o) => ({ id: o.id, text: o.text })))
  const [savingEdit, setSavingEdit] = useState(false)
  const [changing, setChanging]    = useState(false)
  const editClosedRef = useRef(false)
  const lockedRef = useRef(false)
  const editWasOpenRef = useRef(false)
  const changeWasOpenRef = useRef(false)

  const isCreator = !!user && user.id === poll.created_by
  const createdMs = new Date(poll.created_at).getTime()
  const editMsLeft = Math.max(0, createdMs + 60_000 - nowTs)
  const editOpen = isCreator && editMsLeft > 0
  const changeMsLeft = votedAt ? Math.max(0, votedAt + 60_000 - nowTs) : 0
  const changeOpen = !!votedOptionId && changeMsLeft > 0

  // 1-second ticker (only while a window could be open)
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Track whether each window was ever genuinely open this session, so the
  // "closed"/"locked" toasts only fire on a real transition (not for polls
  // already older than 60s when the page loads).
  useEffect(() => { if (editOpen) editWasOpenRef.current = true }, [editOpen])
  useEffect(() => { if (changeOpen) changeWasOpenRef.current = true }, [changeOpen])

  // Default the state selector from the user's profile (if set).
  useEffect(() => {
    if (profile?.state_of_origin) setVoteState(profile.state_of_origin)
  }, [profile?.state_of_origin])

  const isExpired   = new Date(poll.expires_at).getTime() <= Date.now()
  const showResults = !!votedOptionId || isExpired || !user
  const total       = poll.options.reduce((s, o) => s + o.vote_count, 0)

  // Load the comment feed for this poll
  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select('id, comment, created_at, profile:profiles!user_id ( username )')
      .eq('poll_id', poll.id)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: PollComment[] = (data ?? []).map((row: any) => {
      const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
      return {
        id: row.id,
        comment: row.comment,
        created_at: row.created_at,
        username: prof?.username ?? null,
      }
    })
    setComments(mapped)
  }, [poll.id])

  // Check if this user already voted
  useEffect(() => {
    if (!user) { setChecked(true); return }
    supabase
      .from('votes')
      .select('option_id, created_at')
      .eq('poll_id', poll.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVoted(data.option_id as string)
          setVotedAt(new Date(data.created_at as string).getTime())
        }
        setChecked(true)
      })
  }, [user, poll.id])

  // Initial comment load
  useEffect(() => { loadComments() }, [loadComments])

  // Live updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`poll-${poll.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poll_options' }, (payload) => {
        const updated = payload.new as PollOption
        if (updated.poll_id !== poll.id) return
        setPoll((prev) => ({
          ...prev,
          options: prev.options.map((o) =>
            o.id === updated.id ? { ...o, vote_count: updated.vote_count } : o
          ),
        }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polls' }, (payload) => {
        const updated = payload.new as { id: string; total_votes: number }
        if (updated.id !== poll.id) return
        setPoll((prev) => ({ ...prev, total_votes: updated.total_votes }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        const row = payload.new as { poll_id: string; comment: string | null }
        if (row.poll_id === poll.id && row.comment) loadComments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poll.id, loadComments])

  // Apply the vote to local state and compute the post-vote insight.
  function applyVoted(optionId: string) {
    const newOptions = poll.options.map((o) =>
      o.id === optionId ? { ...o, vote_count: o.vote_count + 1 } : o
    )
    const newTotal = newOptions.reduce((s, o) => s + o.vote_count, 0)
    setPoll((prev) => ({
      ...prev,
      total_votes: prev.total_votes + 1,
      options: newOptions,
    }))
    setVoted(optionId)
    setVotedAt(Date.now())

    // Insight
    const sorted = [...newOptions].sort((a, b) => b.vote_count - a.vote_count)
    const votedCount = newOptions.find((o) => o.id === optionId)?.vote_count ?? 0
    const votedPct = newTotal > 0 ? Math.round((votedCount / newTotal) * 100) : 0
    const topPct = newTotal > 0 ? Math.round((sorted[0].vote_count / newTotal) * 100) : 0
    const secondPct = sorted[1] && newTotal > 0 ? Math.round((sorted[1].vote_count / newTotal) * 100) : 0
    setInsight(
      getInsight({
        votedPct,
        topPct,
        isLandslide: topPct > 70,
        isClose: sorted.length >= 2 && topPct - secondPct <= 10,
        stateDiffers: false,
        state: voteState || null,
      }, lang)
    )
  }

  // The "Omo, see result!" moment: suspense → reveal + confetti.
  function runResultMoment(optionId: string) {
    setRevealing(true)
    window.setTimeout(() => {
      setRevealing(false)
      applyVoted(optionId)
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#DC2626', '#16a34a', '#fbbf24', '#ffffff'],
      })
    }, 1500)
  }

  async function submitVote() {
    if (!user || !selectedId) return
    const optionId = selectedId
    const text = sanitizeComment(comment) || null
    const stateVal = voteState || null
    setVoting(true)
    setVoteError('')

    // Offline → queue the vote and register background sync; confirm optimistically.
    // (Challenge polls always go through the live RPC so participation is recorded.)
    if (!isChallenge && typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueVote({ poll_id: poll.id, option_id: optionId, comment: text })
      try {
        const reg = await navigator.serviceWorker?.ready
        // @ts-expect-error - background sync isn't in the TS DOM lib yet
        await reg?.sync?.register('sync-votes')
      } catch { /* sync unsupported — flush happens on reconnect */ }
      applyVoted(optionId)
      setVoting(false)
      return
    }

    // Challenge polls register participation via join_challenge; regular polls cast_vote.
    const { error } = await supabase.rpc(isChallenge ? 'join_challenge' : 'cast_vote', {
      p_poll_id:   poll.id,
      p_option_id: optionId,
      p_comment:   text,
      p_state:     stateVal,
    })

    if (error) {
      setVoteError(
        error.message.includes('already_voted')
          ? t('vote.already')
          : error.message.includes('hourly_vote_limit_reached')
          ? "You're voting too fast! Please slow down."
          : error.message.includes('challenge_not_active')
          ? t('vote.pollEnded')
          : error.message
      )
      setVoting(false)
      return
    }

    setVoting(false)
    if (text) loadComments()
    if (isChallenge) setJustJoined(true)
    runResultMoment(optionId)
  }

  // ── Edit window ─────────────────────────────────────────────
  async function saveEdit() {
    setSavingEdit(true)
    const { error } = await supabase.rpc('edit_poll', {
      p_poll_id: poll.id,
      p_question: editQuestion.trim() || poll.question,
      p_options: editOpts.map((o) => ({ id: o.id, text: o.text.trim() || '—' })),
    })
    setSavingEdit(false)
    if (error) {
      if (error.message.includes('edit_window_expired')) showToast(t('edit.closed'))
      return
    }
    setPoll((prev) => ({
      ...prev,
      question: editQuestion.trim() || prev.question,
      options: prev.options.map((o) => {
        const e = editOpts.find((x) => x.id === o.id)
        return e ? { ...o, text: e.text.trim() || o.text } : o
      }),
    }))
    setEditing(false)
  }

  // Auto-save if the window closes mid-edit, then lock the inputs.
  useEffect(() => {
    if (editMsLeft === 0 && editWasOpenRef.current && !editClosedRef.current && isCreator) {
      editClosedRef.current = true
      if (editing) { saveEdit(); }
      setEditing(false)
      showToast(t('edit.closed'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMsLeft])

  // ── Vote change window ──────────────────────────────────────
  async function changeVote(newOptionId: string) {
    if (!votedOptionId || newOptionId === votedOptionId) return
    setChanging(true)
    const prevId = votedOptionId
    const { error } = await supabase.rpc('change_vote', {
      p_poll_id: poll.id,
      p_new_option_id: newOptionId,
    })
    setChanging(false)
    if (error) {
      if (error.message.includes('change_window_expired')) showToast(t('vote.locked'))
      return
    }
    // Optimistic: move the count from old → new.
    setPoll((prev) => ({
      ...prev,
      options: prev.options.map((o) =>
        o.id === prevId ? { ...o, vote_count: Math.max(0, o.vote_count - 1) }
        : o.id === newOptionId ? { ...o, vote_count: o.vote_count + 1 } : o
      ),
    }))
    setVoted(newOptionId)
  }

  // Lock toast when the change window closes.
  useEffect(() => {
    if (votedOptionId && votedAt && changeMsLeft === 0 && changeWasOpenRef.current && !lockedRef.current) {
      lockedRef.current = true
      showToast(t('vote.lockedToast'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeMsLeft, votedOptionId, votedAt])

  // Results sorted by vote count descending
  const results = [...poll.options]
    .sort((a, b) => b.vote_count - a.vote_count)
    .map((o) => ({
      ...o,
      pct: total > 0 ? Math.round((o.vote_count / total) * 100) : 0,
    }))

  if (!votedChecked) {
    return (
      <div className="flex justify-center py-12 sm:py-16">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* "Omo, see result!" suspense overlay */}
      {revealing && (
        <div className="fixed inset-0 z-[80] bg-gray-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full bg-[#DC2626]"
                style={{ animation: 'flame-pulse 0.9s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-white font-bold text-lg">{t('result.counting')}</p>
        </div>
      )}

      {/* Edit window banner */}
      {editOpen && !editing && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold">
            ✏️ {t('edit.banner')} {Math.ceil(editMsLeft / 1000)} {t('edit.seconds')}
          </span>
          <button
            onClick={() => { setEditQuestion(poll.question); setEditOpts(poll.options.map((o) => ({ id: o.id, text: o.text }))); setEditing(true) }}
            className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 min-h-[36px] rounded-full hover:bg-amber-600 active:scale-95 transition-all shrink-0"
          >
            <Pencil size={13} /> {t('edit.btn')}
          </button>
        </div>
      )}

      {/* Question — editable inline within the 60s window */}
      {editing ? (
        <div className="flex flex-col gap-3">
          <textarea
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value.slice(0, 280))}
            rows={2}
            className="w-full border-2 border-amber-300 rounded-xl px-4 py-3 text-lg font-bold bg-transparent resize-none outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex flex-col gap-2">
            {editOpts.map((o, i) => (
              <input
                key={o.id}
                value={o.text}
                onChange={(e) => setEditOpts((prev) => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value.slice(0, 120) } : x))}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-base bg-transparent outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} disabled={savingEdit}
              className="flex-1 min-h-[44px] rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-border transition-colors">
              {t('edit.cancel')}
            </button>
            <button onClick={saveEdit} disabled={savingEdit}
              className="flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60">
              {savingEdit ? <Loader2 size={16} className="animate-spin" /> : t('edit.save')}
            </button>
          </div>
        </div>
      ) : (
        <h1 className="text-xl sm:text-2xl font-black text-foreground leading-snug">{poll.question}</h1>
      )}

      {/* Poll meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[poll.category] ?? 'bg-muted text-muted-foreground'}`}>
          {poll.category}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={11} />
          <span>{isExpired ? t('vote.pollEnded') : timeRemaining(poll.expires_at).replace(/left$/, t('card.left'))}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Users size={11} />
          <span>{fmtVotes(poll.total_votes)} {t('card.votes')}</span>
        </div>
      </div>

      {/* Challenge banner */}
      {isChallenge && !votedOptionId && !justJoined && (
        <ChallengeBanner pool={poll.challenge_pool} />
      )}

      {/* Vote selection OR results */}
      {showResults ? (
        <ResultsBars
          results={results}
          votedOptionId={votedOptionId}
          total={total}
          changeOpen={changeOpen}
          changeSecondsLeft={Math.ceil(changeMsLeft / 1000)}
          changing={changing}
          onChange={changeVote}
          locked={!!votedOptionId && !!votedAt && !changeOpen}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {poll.options
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((opt) => {
              const isSel = selectedId === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  disabled={voting}
                  aria-pressed={isSel}
                  className={`w-full flex items-center justify-between gap-3 text-left px-4 sm:px-5 py-4 min-h-[56px] rounded-2xl border-2 transition-all duration-150 text-sm font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-snug ${
                    isSel
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border bg-card text-foreground hover:border-primary active:scale-[0.98]'
                  }`}
                >
                  <span>{opt.text}</span>
                  {isSel && <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0" />}
                </button>
              )
            })}

          {/* Optional comment + state — appears once an option is chosen */}
          {selectedId && (
            <div className="flex flex-col gap-3 pt-1">
              {/* State (optional) — powers the state-by-state breakdown */}
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 min-h-[44px] focus-within:ring-2 focus-within:ring-primary">
                <MapPin size={15} className="text-muted-foreground shrink-0" />
                <select
                  value={voteState}
                  onChange={(e) => setVoteState(e.target.value)}
                  className="flex-1 bg-transparent text-base outline-none py-2.5"
                >
                  <option value="">Your state (optional)</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                  placeholder={t('vote.commentPlaceholder')}
                  rows={3}
                  maxLength={MAX_COMMENT}
                  className="w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent resize-none outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                  {comment.length}/{MAX_COMMENT}
                </p>
              </div>
              <button
                onClick={submitVote}
                disabled={voting}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {voting ? (
                  <><Loader2 size={17} className="animate-spin" /> {t('vote.submitting')}</>
                ) : (
                  `${t('vote.submit')} (+10 tokens)`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voted confirmation */}
      {votedOptionId && (
        <div className="flex items-start gap-2.5 bg-primary-light text-primary px-4 py-3 rounded-xl">
          <CheckCircle2 size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span className="text-sm font-semibold flex-1 leading-snug">
            {t('vote.youVoted')}{' '}
            <strong>&ldquo;{poll.options.find((o) => o.id === votedOptionId)?.text}&rdquo;</strong>
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold shrink-0 mt-0.5">
            <Star size={11} /> +10 tokens
          </span>
        </div>
      )}

      {/* Challenge join celebration */}
      {isChallenge && justJoined && (
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-5 flex flex-col gap-3 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="shrink-0" />
            <p className="text-lg font-black leading-snug">{t('challenge.joined')}</p>
          </div>
          <p className="text-sm text-white/90 leading-snug">{t('challenge.joinedSub')}</p>
          {poll.challenge_pool > 0 && (
            <p className="text-sm font-bold">
              {t('challenge.pool')}: {poll.challenge_pool.toLocaleString()} {t('challenge.tokens')} 🪙
            </p>
          )}
          <a
            href={whatsappHref(shareMessages.challenge(poll.id, poll.question, poll.challenge_pool))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white text-amber-600 text-sm font-bold px-5 min-h-[44px] rounded-full hover:brightness-95 active:scale-95 transition-all"
          >
            {t('challenge.share')}
          </a>
        </div>
      )}

      {/* Surprise insight + share */}
      {votedOptionId && !justJoined && insight && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-5 flex flex-col gap-3 animate-fade-in-up">
          <p className="text-base font-bold leading-snug">{insight}</p>
          <a
            href={whatsappHref(
              shareMessages.afterVote(
                poll.id,
                poll.question,
                total > 0
                  ? Math.round(((poll.options.find((o) => o.id === votedOptionId)?.vote_count ?? 0) / total) * 100)
                  : 0
              )
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm font-bold px-5 min-h-[44px] rounded-full hover:brightness-95 active:scale-95 transition-all"
          >
            {t('result.shareResult')}
          </a>
        </div>
      )}

      {/* Unauthenticated prompt */}
      {!user && !isExpired && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm text-muted-foreground">
            {t('vote.signInPrompt')}{' '}
            <span className="text-primary font-semibold">+10 tokens</span>.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-primary-dark active:scale-95 transition-all min-h-[48px]"
          >
            {t('vote.signInBtn')}
          </Link>
        </div>
      )}

      {voteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {voteError}
        </p>
      )}

      {/* Comments feed */}
      <CommentsFeed comments={comments} />
    </div>
  )
}

// ── CSS progress-bar results — works at any width ─────────────

interface ResultEntry {
  id: string
  text: string
  vote_count: number
  pct: number
}

function ResultsBars({
  results,
  votedOptionId,
  total,
  changeOpen = false,
  changeSecondsLeft = 0,
  changing = false,
  onChange,
  locked = false,
}: {
  results: ResultEntry[]
  votedOptionId: string | null
  total: number
  changeOpen?: boolean
  changeSecondsLeft?: number
  changing?: boolean
  onChange?: (optionId: string) => void
  locked?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4">
      {/* Change-your-vote window banner */}
      {changeOpen && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <RefreshCw size={14} className={changing ? 'animate-spin' : ''} />
          {t('change.banner')} {changeSecondsLeft} {t('change.suffix')}
        </div>
      )}
      {/* Locked badge */}
      {locked && (
        <div className="flex items-center gap-2 bg-muted text-muted-foreground rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Lock size={14} /> {t('vote.locked')}
        </div>
      )}

      {results.map((opt) => {
        const isVoted = opt.id === votedOptionId
        return (
          <div key={opt.id}>
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className={`text-sm leading-snug ${isVoted ? 'text-primary font-semibold' : 'text-foreground/80 font-medium'}`}>
                {isVoted && (
                  <CheckCircle2 size={13} className="inline mr-1 mb-0.5 shrink-0" />
                )}
                {opt.text}
              </span>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${isVoted ? 'text-primary' : 'text-foreground'}`}>
                {opt.pct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full animate-bar ${isVoted ? 'bg-primary' : 'bg-primary/30'}`}
                style={{ width: `${opt.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {opt.vote_count.toLocaleString()} vote{opt.vote_count !== 1 ? 's' : ''}
              </p>
              {changeOpen && !isVoted && onChange && (
                <button
                  onClick={() => onChange(opt.id)}
                  disabled={changing}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                >
                  {t('change.to')}
                </button>
              )}
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground text-right border-t border-border pt-2.5 mt-1">
        {total.toLocaleString()} {t('vote.totalVotes')}
      </p>
    </div>
  )
}

// ── Challenge banner ──────────────────────────────────────────

function ChallengeBanner({ pool }: { pool: number }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-start gap-2.5 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 text-amber-800 rounded-xl px-4 py-3">
      <Trophy size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-amber-500" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide">{t('challenge.badge')}</p>
        <p className="text-sm font-semibold leading-snug">
          {t('challenge.banner')} {pool.toLocaleString()} {t('challenge.tokens')} 🪙
        </p>
      </div>
    </div>
  )
}

// ── Comments feed ─────────────────────────────────────────────

function CommentsFeed({ comments }: { comments: PollComment[] }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-border">
      <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
        <MessageCircle size={15} strokeWidth={2.5} />
        {t('comments.title')}
        <span className="text-muted-foreground font-normal">({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('comments.empty')}
        </p>
      ) : (
      <div className="flex flex-col gap-4">
        {comments.map((c) => {
          const handle  = c.username ? `@${c.username}` : 'Anonymous'
          const initials = c.username ? c.username.slice(0, 2).toUpperCase() : '?'
          return (
            <div key={c.id} className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none"
                style={{ backgroundColor: avatarColor(c.username ?? c.id) }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{handle}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                  <span className="ml-auto shrink-0"><ReportButton commentId={c.id} size={12} /></span>
                </div>
                <p className="text-sm text-foreground/80 leading-snug break-words mt-0.5">
                  {c.comment}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
