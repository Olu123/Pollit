// Client-side instrumentation (Next.js 15.3+ replaces sentry.client.config.ts).
// Runs after the HTML loads but before React hydration — the right place to
// initialise error monitoring and analytics.
import * as Sentry from '@sentry/nextjs'
import { initPostHog } from '@/lib/posthog'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [],
})

initPostHog()

// Lets Sentry tie client-side navigations to traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
