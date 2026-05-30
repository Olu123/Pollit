'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import type { Poll, PollCategory } from '@/lib/types'
import { useLanguage } from './LanguageProvider'
import type { StringKey } from '@/lib/i18n'

function fmtVotes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function HotTakeCard({ poll }: { poll: Poll }) {
  const { t } = useLanguage()
  const total = poll.options.reduce((s, o) => s + o.vote_count, 0) || poll.total_votes
  const top = [...poll.options].sort((a, b) => b.vote_count - a.vote_count).slice(0, 2)

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="group relative shrink-0 w-[280px] sm:w-[300px] snap-start bg-gray-900 rounded-xl border border-gray-800 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 flex flex-col gap-3.5 overflow-hidden"
    >
      {/* glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#DC2626]/20 rounded-full blur-2xl pointer-events-none" />

      {/* badge + category */}
      <div className="flex items-center justify-between gap-2 relative">
        <span className="inline-flex items-center gap-1 bg-[#DC2626] text-white text-xs font-black px-2.5 py-1 rounded-full">
          <span className="animate-flame">🔥</span> HOT TAKE
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {t(`cat.${poll.category}` as StringKey)}
        </span>
      </div>

      {/* question */}
      <h3 className="font-black text-white text-lg leading-snug line-clamp-3 relative">{poll.question}</h3>

      {/* top options */}
      <div className="flex flex-col gap-2 relative">
        {top.map((opt) => {
          const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
          return (
            <div key={opt.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-200 truncate">{opt.text}</span>
                <span className="font-bold text-white tabular-nums shrink-0">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-[#DC2626] animate-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className="mt-auto pt-3 border-t border-gray-800 flex items-center justify-between gap-2 relative">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-300">
          <Users size={13} strokeWidth={2.5} />
          {fmtVotes(poll.total_votes)} {t('card.votes')}
        </span>
        <span className="text-sm font-bold text-[#DC2626] group-hover:text-red-400 transition-colors">
          {t('card.vote')} →
        </span>
      </div>
    </Link>
  )
}
