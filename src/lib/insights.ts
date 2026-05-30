import type { Lang } from './i18n'

export interface InsightInput {
  votedPct: number       // % of total for the user's chosen option
  topPct: number         // % of the leading option overall
  isLandslide: boolean   // leading option > 70%
  isClose: boolean       // top two within 10%
  stateDiffers: boolean  // user's state winner != national winner
  state: string | null
}

// Returns one contextual, bilingual insight message.
export function getInsight(input: InsightInput, lang: Lang): string {
  const { votedPct, topPct, isLandslide, isClose, stateDiffers, state } = input
  const en = lang === 'en'

  if (isLandslide) {
    return en
      ? `E don finish! ${topPct}% of Nigerians don decide! 🔥`
      : `E don finish! ${topPct}% of Naija don decide! 🔥`
  }
  if (stateDiffers && state) {
    return en
      ? `Interesting! ${state} people see am differently from the rest of Nigeria 🤔`
      : `Interesting! ${state} people see am differently from the rest of Naija 🤔`
  }
  if (isClose) {
    return en
      ? `E dey very close! This one go cause argument 👀`
      : `E dey very close! This one go cause argument 👀`
  }
  if (votedPct >= 50) {
    return en
      ? `You dey with majority! ${votedPct}% of Nigerians agree with you 🎯`
      : `You dey with majority! ${votedPct}% of Naija gree with you 🎯`
  }
  return en
    ? `Na bold choice! Only ${votedPct}% of people voted like you 💪`
    : `Na bold choice! Na only ${votedPct}% vote like you 💪`
}
