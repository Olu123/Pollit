import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import type { Poll, PollCategory } from '@/lib/types'

const CATEGORY_STYLES: Record<PollCategory, string> = {
  Politics: 'bg-red-100 text-red-700',
  Sports: 'bg-blue-100 text-blue-700',
  Entertainment: 'bg-violet-100 text-violet-700',
  Business: 'bg-amber-100 text-amber-700',
  Lifestyle: 'bg-pink-100 text-pink-700',
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h left`
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return `${mins}m left`
}

function fmtVotes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function PollCard({ poll }: { poll: Poll }) {
  const sorted = [...poll.options].sort((a, b) => b.vote_count - a.vote_count)
  const top = sorted.slice(0, 2)
  // total from live options (may differ from poll.total_votes if just voted)
  const total = poll.options.reduce((s, o) => s + o.vote_count, 0) || poll.total_votes

  return (
    <article className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200 p-5 flex flex-col gap-4">
      {/* Top row: category + time */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${CATEGORY_STYLES[poll.category]}`}
        >
          {poll.category}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock size={11} strokeWidth={2} />
          <span>{timeRemaining(poll.expires_at)}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-3">
        {poll.question}
      </h3>

      {/* Top 2 options with progress bars */}
      <div className="flex flex-col gap-3">
        {top.map((opt) => {
          const pct =
            total > 0
              ? Math.round((opt.vote_count / total) * 100)
              : 0
          return (
            <div key={opt.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground/75 truncate">{opt.text}</span>
                <span className="font-semibold text-foreground tabular-nums shrink-0">
                  {pct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={13} strokeWidth={2} />
          <span>{fmtVotes(poll.total_votes)} votes</span>
        </div>
        <Link
          href={`/polls/${poll.id}`}
          className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-primary-dark transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Vote
        </Link>
      </div>
    </article>
  )
}
