'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Users, Clock, CheckCircle2, Loader2, Star, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { Poll, PollOption } from '@/lib/types'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'
import { useToast } from './ToastProvider'
import { enqueueVote } from '@/lib/voteQueue'
import { getInsight } from '@/lib/insights'
import { shareMessages, whatsappHref } from '@/lib/share'
import { analytics } from '@/lib/analytics'
import { sanitizeComment } from '@/lib/sanitize'
import { useVoteStatus } from '@/lib/voting/useVoteStatus'
import { useCommentsFeed } from '@/lib/voting/useCommentsFeed'
import ResultsBars from './voting/ResultsBars'
import ChallengeBanner from './voting/ChallengeBanner'
import CommentsFeed from './voting/CommentsFeed'
import VoteOptionsForm from './voting/VoteOptionsForm'
import EditableQuestion from './voting/EditableQuestion'

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

function fmtVotes(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

const CATEGORY_STYLES: Record<string, string> = {
  Politics:      'bg-red-100 text-red-700',
  Sports:        'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business:      'bg-amber-100 text-amber-700',
  Lifestyle:     'bg-pink-100 text-pink-700',
}

export default function VotingPanel({ poll: initialPoll }: { poll: Poll }) {
  const { user, profile } = useAuth()
  const { t, lang } = useLanguage()
  const { showToast } = useToast()

  const [poll, setPoll]            = useState(initialPoll)
  const {
    votedOptionId, votedAt, checked: votedChecked,
    setVotedOptionId: setVoted, setVotedAt,
  } = useVoteStatus(poll.id, user?.id)
  const { comments, reload: reloadComments } = useCommentsFeed(poll.id)

  const [selectedId, setSelected]  = useState<string | null>(null)
  const [comment, setComment]      = useState('')
  const [voteState, setVoteState]  = useState('')
  const [voteLga, setVoteLga]      = useState('')
  const [voting, setVoting]        = useState(false)
  const [voteError, setVoteError]  = useState('')
  const [revealing, setRevealing]  = useState(false)
  const [insight, setInsight]      = useState('')
  const [justJoined, setJustJoined] = useState(false)

  const isChallenge = !!poll.is_challenge

  // Edit window + vote-change window
  const [nowTs, setNowTs]          = useState(() => Date.now())
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
        if (row.poll_id === poll.id && row.comment) reloadComments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [poll.id, reloadComments])

  // Apply the vote to local state and compute the post-vote insight.
  const applyVoted = useCallback((optionId: string) => {
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
  }, [poll.options, voteState, lang, setVoted, setVotedAt])

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
    const lgaVal = (voteState && voteLga) ? voteLga : null
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
      analytics.pollVoted(poll.id, poll.category, !!text, stateVal)
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
      p_lga:       lgaVal,
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
    if (isChallenge) {
      analytics.challengeJoined(poll.id, poll.challenge_pool)
    } else {
      analytics.pollVoted(poll.id, poll.category, !!text, stateVal)
    }
    if (text) reloadComments()
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

      <EditableQuestion
        question={poll.question}
        editOpen={editOpen}
        editing={editing}
        editSecondsLeft={Math.ceil(editMsLeft / 1000)}
        onStartEdit={() => {
          setEditQuestion(poll.question)
          setEditOpts(poll.options.map((o) => ({ id: o.id, text: o.text })))
          setEditing(true)
        }}
        editQuestion={editQuestion}
        onQuestionChange={setEditQuestion}
        editOpts={editOpts}
        onOptionChange={(i, value) => setEditOpts((prev) => prev.map((x, idx) => idx === i ? { ...x, text: value } : x))}
        savingEdit={savingEdit}
        onCancel={() => setEditing(false)}
        onSave={saveEdit}
      />

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
        <VoteOptionsForm
          options={poll.options}
          selectedId={selectedId}
          onSelect={setSelected}
          voting={voting}
          comment={comment}
          onCommentChange={setComment}
          voteState={voteState}
          onStateChange={setVoteState}
          voteLga={voteLga}
          onLgaChange={setVoteLga}
          onSubmit={submitVote}
          isChallenge={isChallenge}
        />
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
            <Star size={11} /> +{isChallenge ? 7 : 5} tokens
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
            onClick={() => analytics.pollShared(poll.id, 'whatsapp')}
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
            onClick={() => analytics.pollShared(poll.id, 'whatsapp')}
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
            <span className="text-primary font-semibold">+{isChallenge ? 7 : 5} tokens</span>.
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
