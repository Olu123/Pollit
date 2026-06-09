'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

// Fires a poll_viewed event from the (server-rendered) poll detail page.
export default function PollViewTracker({
  pollId,
  category,
  isChallenge,
}: {
  pollId: string
  category: string
  isChallenge: boolean
}) {
  useEffect(() => {
    analytics.pollViewed(pollId, category, isChallenge)
  }, [pollId, category, isChallenge])

  return null
}
