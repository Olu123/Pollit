'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

const VIEW_EVENTS = {
  leaderboard:  analytics.leaderboardViewed,
  pulse:        analytics.pulseViewed,
  transparency: analytics.transparencyViewed,
  faq:          analytics.faqViewed,
} as const

// Fires a one-off "<page>_viewed" event on mount. Lets server components
// (leaderboard, pulse) emit analytics without becoming client components.
export default function ViewTracker({ event }: { event: keyof typeof VIEW_EVENTS }) {
  useEffect(() => {
    VIEW_EVENTS[event]()
  }, [event])

  return null
}
