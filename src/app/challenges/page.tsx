import Link from 'next/link'
import { Trophy, Users, Clock, Coins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { T } from '@/components/LanguageProvider'
import type { Poll } from '@/lib/types'

export const revalidate = 30

const CHALLENGE_SELECT = `
  id, question, category, created_by, expires_at, total_votes, is_hot_take,
  is_community, community_name, community_code, community_password,
  is_challenge, challenge_pool, challenge_status, challenge_distributed, created_at,
  profile:profiles!created_by ( id, username, avatar_url ),
  options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
`

async function getChallenges(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select(CHALLENGE_SELECT)
    .eq('is_challenge', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) {
    console.error('Challenges fetch error:', error.message)
    return []
  }
  return (data ?? []) as unknown as Poll[]
}

function isActive(p: Poll): boolean {
  return p.challenge_status === 'active' && new Date(p.expires_at).getTime() > Date.now()
}

export default async function ChallengesPage() {
  const all = await getChallenges()
  const active = all.filter(isActive)
  const completed = all.filter((p) => !isActive(p))

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
          <T k="challenge.title" />
        </h1>
        <p className="text-sm text-muted-foreground"><T k="challenge.subtitle" /></p>
      </header>

      {all.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Trophy size={36} className="text-amber-500" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-lg text-foreground"><T k="challenge.none" /></p>
            <p className="text-sm text-muted-foreground mt-1"><T k="challenge.noneSub" /></p>
          </div>
        </div>
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-black text-foreground"><T k="challenge.active" /></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map((p) => <ChallengeCard key={p.id} poll={p} />)}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-black text-foreground"><T k="challenge.completed" /></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {completed.map((p) => <ChallengeCard key={p.id} poll={p} completed />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  if (d > 0) return `${d}d ${h}h left`
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m left`
  return `${m}m left`
}

function ChallengeCard({ poll, completed = false }: { poll: Poll; completed?: boolean }) {
  // Every join records a vote 1:1, so total_votes is the participant count.
  const participants = poll.total_votes
  const winner = [...poll.options].sort((a, b) => b.vote_count - a.vote_count)[0]
  const ended = completed

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-3.5 shadow-sm transition-all duration-200 ${
        ended
          ? 'bg-card border-border opacity-90'
          : 'bg-gradient-to-br from-amber-50 to-white border-amber-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">
          <Trophy size={12} strokeWidth={2.5} /> <T k="challenge.badge" />
        </span>
        <div className={`flex items-center gap-1 text-xs font-medium ${ended ? 'text-muted-foreground' : 'text-amber-600'}`}>
          <Clock size={11} strokeWidth={2.5} />
          <span>{ended ? <T k="challenge.ended" /> : timeLeft(poll.expires_at)}</span>
        </div>
      </div>

      <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-3">{poll.question}</h3>

      {/* Token pool */}
      <div className="flex items-center justify-between gap-2 bg-amber-100/60 rounded-xl px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Coins size={14} strokeWidth={2.5} /> <T k="challenge.pool" />
        </span>
        <span className="text-base font-black text-amber-700 tabular-nums">
          {poll.challenge_pool.toLocaleString()}
        </span>
      </div>

      {/* Completed: show winning option */}
      {ended && winner && participants > 0 && (
        <p className="text-xs text-muted-foreground">
          🏅 <span className="font-semibold text-foreground">{winner.text}</span>
          {' '}({Math.round((winner.vote_count / participants) * 100)}%)
        </p>
      )}

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Users size={13} strokeWidth={2.5} />
          {participants.toLocaleString()} <T k="challenge.participants" />
        </span>
        <Link
          href={`/polls/${poll.id}`}
          className={`flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95 ${
            ended
              ? 'bg-muted text-foreground hover:bg-border'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {ended ? <T k="challenge.view" /> : <T k="challenge.join" />}
        </Link>
      </div>
    </article>
  )
}
