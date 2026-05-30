import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import type { Poll, PollCategory } from '@/lib/types'

const SITE = 'agora-ng.vercel.app'

function whatsappUrl(poll: Poll): string {
  const text = `Vote on this poll: ${poll.question} — ${SITE}/polls/${poll.id}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

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
      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Users size={13} strokeWidth={2} />
          <span>{fmtVotes(poll.total_votes)} votes</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={whatsappUrl(poll)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on WhatsApp"
            title="Share on WhatsApp"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
          >
            <WhatsAppIcon />
          </a>
          <Link
            href={`/polls/${poll.id}`}
            className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-primary-dark transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Vote
          </Link>
        </div>
      </div>
    </article>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L.054 23.447a.75.75 0 0 0 .916.977l5.7-1.494A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.96 9.96 0 0 1-5.071-1.38l-.364-.214-3.763.987.999-3.667-.236-.375A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  )
}
