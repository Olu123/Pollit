'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

const REF_KEY = 'pollit_ref'

// Captures ?ref=<username> on landing, then links the referral once the user
// is signed in (and not already referred), awarding the referrer via RPC.
export default function ReferralTracker() {
  const { user, profile } = useAuth()

  // 1. Capture ?ref= from the URL.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) {
      try { localStorage.setItem(REF_KEY, ref) } catch {}
    }
  }, [])

  // 2. Claim once the user has a profile with no referrer yet.
  useEffect(() => {
    if (!user || !profile) return
    if (profile.referred_by) { try { localStorage.removeItem(REF_KEY) } catch {}; return }

    const ref = (() => { try { return localStorage.getItem(REF_KEY) } catch { return null } })()
    if (!ref || ref === profile.username) return

    supabase.rpc('claim_referral', { p_referrer_username: ref }).then(() => {
      try { localStorage.removeItem(REF_KEY) } catch {}
    })
  }, [user, profile])

  return null
}
