import { SITE_DOMAIN } from './site'

export interface VerdictOption {
  text: string
  vote_count: number
}

export interface VerdictData {
  statement: string
  citation: string
  percentage: number
  winner: string
  total_votes: number
  isLandslide: boolean
  isClose: boolean
  question: string
  month: string
}

// Generates the "Nigerian Verdict" statement + citation for a poll. Branch
// coverage is intentionally exhaustive at the boundaries — isLandslide
// (>=70), isMajority && !isClose (55-69), isClose (<55) — so the winner
// case at the end never fires today, but is kept as a safety net in case
// the thresholds change.
export function generateVerdict(
  question: string,
  options: VerdictOption[],
  total_votes: number,
  category: string,
  created_at: string
): VerdictData {
  const sorted = [...options].sort((a, b) => b.vote_count - a.vote_count)
  const winner = sorted[0]
  const percentage = total_votes > 0 ? Math.round((winner.vote_count / total_votes) * 100) : 0
  const month = new Date(created_at).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const isLandslide = percentage >= 70
  const isClose = percentage < 55
  const isMajority = percentage >= 50

  let statement = ''
  if (isLandslide) {
    statement = `${percentage}% of Nigerians overwhelmingly choose "${winner.text}"`
  } else if (isMajority && !isClose) {
    statement = `A clear majority (${percentage}%) of Nigerians prefer "${winner.text}"`
  } else if (isClose) {
    statement = `Nigerians are divided — ${percentage}% lean toward "${winner.text}" but the debate continues`
  } else {
    statement = `${percentage}% of Nigerians say "${winner.text}"`
  }

  const citation = `WePollit — ${month} (n=${total_votes.toLocaleString()})`

  return {
    statement,
    citation,
    percentage,
    winner: winner.text,
    total_votes,
    isLandslide,
    isClose,
    question,
    month,
  }
}

// Plain-text form for the "Copy" button — shorter than the WhatsApp share
// message (see shareMessages.verdict in @/lib/share), no hashtags/CTA.
export function verdictCopyText(data: VerdictData, pollId: string): string {
  return `🇳🇬 The Nigerian Verdict:\n${data.statement}\n${data.citation}\nSource: ${SITE_DOMAIN}/polls/${pollId}`
}
