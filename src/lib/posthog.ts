import PostHog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  // Idempotent — safe to call from instrumentation-client and the provider.
  if ((PostHog as { __loaded?: boolean }).__loaded) return

  PostHog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    capture_pageview: false, // captured manually in PostHogProvider
    capture_pageleave: true,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug()
      }
    },
  })
}

export const posthog = typeof window !== 'undefined' ? PostHog : null
