// Shared constants + types for the Token Transparency system.

// Fixed maximum token supply that will ever exist.
export const TOTAL_SUPPLY = 100_000_000

export type ReasonType =
  | 'vote'
  | 'poll_created'
  | 'challenge'
  | 'referral'
  | 'admin_adjustment'
  | 'signup'

export interface TokenTransaction {
  id: string
  user_id: string | null
  username: string | null
  amount: number
  reason: string
  reason_type: string
  poll_id: string | null
  created_at: string
}
