'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthProvider'
import OnboardingModal from './OnboardingModal'

const ONBOARDED_KEY = 'pollit_onboarded'

interface OnboardingState {
  openOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingState>({ openOnboarding: () => {} })

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)

  // Auto-open once for a signed-in user who hasn't seen it.
  useEffect(() => {
    if (loading || !user) return
    let seen = false
    try { seen = localStorage.getItem(ONBOARDED_KEY) === 'true' } catch {}
    if (!seen) setOpen(true)
  }, [user, loading])

  function close() {
    setOpen(false)
    try { localStorage.setItem(ONBOARDED_KEY, 'true') } catch {}
  }

  const openOnboarding = () => setOpen(true)

  return (
    <OnboardingContext.Provider value={{ openOnboarding }}>
      {children}
      <OnboardingModal open={open} onClose={close} />
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => useContext(OnboardingContext)
