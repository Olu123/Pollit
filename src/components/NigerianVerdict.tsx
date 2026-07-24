'use client'

import { useRef, useState } from 'react'
import { Share2, Copy, Download, Loader2 } from 'lucide-react'
import { generateVerdict, verdictCopyText, type VerdictOption } from '@/lib/verdict'
import { shareMessages, whatsappHref } from '@/lib/share'
import { analytics } from '@/lib/analytics'
import { useToast } from './ToastProvider'

export default function NigerianVerdict({
  pollId,
  question,
  options,
  totalVotes,
  category,
  createdAt,
}: {
  pollId: string
  question: string
  options: VerdictOption[]
  totalVotes: number
  category: string
  createdAt: string
}) {
  const { showToast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  if (totalVotes < 10) return null

  const verdict = generateVerdict(question, options, totalVotes, category, createdAt)
  const shareHref = whatsappHref(shareMessages.verdict(pollId, verdict.statement, verdict.question, verdict.citation))

  function copy() {
    navigator.clipboard?.writeText(verdictCopyText(verdict, pollId)).then(() => {
      analytics.pollShared(pollId, 'verdict_copy')
      showToast('Verdict copied to clipboard!')
    })
  }

  async function download() {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `nigerian-verdict-${pollId}.png`
      a.click()
      analytics.pollShared(pollId, 'verdict_download')
    } catch {
      showToast('Could not generate the image. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="animate-fade-in-up bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Captured for the PNG download — action buttons live outside this div */}
      <div ref={cardRef} className="border-t-4 border-[#DC2626] bg-white px-5 sm:px-7 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-widest text-[#DC2626]">
            🇳🇬 THE NIGERIAN VERDICT
          </span>
          <span className="flex-1 h-px bg-primary/20" />
        </div>

        <p className="text-xl sm:text-2xl font-black text-foreground leading-snug">
          &ldquo;{verdict.statement}&rdquo;
        </p>

        <p className="text-sm text-muted-foreground">
          Poll: &ldquo;{question}&rdquo;
        </p>

        <div className="h-px bg-border" />

        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          WePollit — {verdict.month}
          <br />
          (n={verdict.total_votes.toLocaleString()} verified votes)
        </p>

        <p className="text-xs font-bold text-primary">wepollit.com</p>
      </div>

      {/* Actions — not part of the downloaded image */}
      <div className="flex items-center gap-2 px-5 sm:px-7 py-3.5 bg-muted/40 border-t border-border">
        <a
          href={shareHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => analytics.pollShared(pollId, 'verdict_whatsapp')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 min-h-[40px] rounded-full bg-[#25D366] text-white hover:brightness-95 active:scale-95 transition-all"
        >
          <Share2 size={14} /> Share
        </a>
        <button
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 min-h-[40px] rounded-full bg-muted text-foreground hover:bg-border active:scale-95 transition-all"
        >
          <Copy size={14} /> Copy
        </button>
        <button
          onClick={download}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-3 min-h-[40px] rounded-full bg-muted text-foreground hover:bg-border active:scale-95 transition-all disabled:opacity-60"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download
        </button>
      </div>
    </section>
  )
}
