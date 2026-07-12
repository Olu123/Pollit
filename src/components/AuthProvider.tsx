'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { useLanguage } from './LanguageProvider'
import { useToast } from './ToastProvider'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null, profile: null, loading: true, refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const { showToast } = useToast()

  useEffect(() => {
    // Resolve current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for sign-in / sign-out. 'SIGNED_IN' (as opposed to
    // 'INITIAL_SESSION', which fires when an already-logged-in visitor's
    // persisted session is restored on page load) only fires for an
    // actual new sign-in this browser session — the right moment to fold
    // in any guest votes cast before signing up.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
      if (event === 'SIGNED_IN') {
        fetch('/api/guest-vote/migrate', { method: 'POST' })
          .then((r) => r.json())
          .then((data: { migrated?: number }) => {
            if (data.migrated && data.migrated > 0) {
              showToast(`${t('guest.voteSaved')} +${data.migrated * 5} ${t('challenge.tokens')} 🎉`)
            }
          })
          .catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [t, showToast])

  // Fetch Supabase profile whenever the user changes
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data ?? null))
  }, [user])

  // Re-fetches the current user's profile row — used after actions that
  // change server-side state the client can't derive locally, e.g. a
  // token spend (tipping) that also needs to reflect on the recipient's
  // side eventually via realtime, but must be immediate for the sender.
  const refreshProfile = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data ?? null)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
