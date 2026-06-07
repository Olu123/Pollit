'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'
import { useAuth } from './AuthProvider'

// Pageview tracking lives in its own component so the useSearchParams() call
// can sit behind a Suspense boundary (required by Next.js for static routes).
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!posthog) return
    initPostHog() // idempotent — guarantees init before the first capture
    posthog.capture('$pageview', {
      $current_url: window.location.href,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  return null
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = useAuth()
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initPostHog()
      initialized.current = true
    }
  }, [])

  // Identify the user when logged in; reset on logout.
  useEffect(() => {
    if (user && profile && posthog) {
      posthog.identify(user.id, {
        username: profile.username,
        points: profile.points,
        is_admin: profile.is_admin,
        created_at: profile.created_at,
      })
    } else if (!user && posthog) {
      posthog.reset()
    }
  }, [user, profile])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
