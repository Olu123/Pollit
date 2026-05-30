import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Poll } from '@/lib/types'
import VotingPanel from '@/components/VotingPanel'

// Re-validate every 60 s so the server snapshot stays reasonably fresh.
// Real-time updates from VotingPanel (client) keep the UI live between revalidations.
export const revalidate = 60

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('polls')
    .select(`
      id, question, category, created_by, expires_at, total_votes, created_at,
      profile:profiles!created_by ( id, username, full_name, avatar_url, points, created_at, updated_at ),
      options:poll_options ( id, poll_id, text, vote_count, display_order, created_at )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  // Cast Supabase response to our Poll type
  const poll = data as unknown as Poll

  // Sort options by display_order for consistent rendering
  poll.options = [...poll.options].sort((a, b) => a.display_order - b.display_order)

  const createdAt = new Date(poll.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={15} />
        All polls
      </Link>

      {/* Poll card */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-8 shadow-sm flex flex-col gap-5 sm:gap-6">
        {/* Question */}
        <h1 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
          {poll.question}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {poll.profile?.username && (
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span>@{poll.profile.username}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{createdAt}</span>
          </div>
        </div>

        {/* Voting panel (client — handles real-time, auth, RPC) */}
        <VotingPanel poll={poll} />
      </div>

      {/* Share prompt */}
      <p className="text-center text-xs text-muted-foreground">
        Share this poll with Nigerians and keep the conversation going.
      </p>
    </main>
  )
}
