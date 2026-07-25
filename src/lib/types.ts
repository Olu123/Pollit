export type PollCategory =
  | 'Politics'
  | 'Sports'
  | 'Entertainment'
  | 'Business'
  | 'Lifestyle'

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  points: number
  phone: string | null
  age_range: string | null
  sex: string | null
  birth_month: number | null
  birth_day: number | null
  bio: string | null
  state_of_origin: string | null
  newsletter_opt_in: boolean
  notify_daily_summary: boolean
  notify_expiry_reminder: boolean
  referred_by: string | null
  referral_count: number
  is_admin: boolean
  first_vote_at: string | null
  first_poll_at: string | null
  flag_count: number
  last_flag_at: string | null
  created_at: string
  updated_at: string
}

export interface PollOption {
  id: string
  poll_id: string
  text: string
  vote_count: number
  display_order: number
}

export interface Poll {
  id: string
  question: string
  category: PollCategory
  created_by: string | null
  expires_at: string
  total_votes: number
  is_hot_take: boolean
  is_community: boolean
  community_name: string | null
  community_code: string | null
  community_password: string | null
  is_challenge: boolean
  challenge_pool: number
  challenge_status: string
  challenge_distributed: boolean
  is_flagged: boolean
  deleted_at: string | null
  created_at: string
  image_url: string | null
  extension_count: number
  original_expires_at: string | null
  profile: Profile | null
  options: PollOption[]
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  comment: string | null
  state: string | null
  changed_at: string | null
  original_option_id: string | null
  agree_count: number
  disagree_count: number
  tips_received: number
  created_at: string
}

export type CommentReaction = 'agree' | 'disagree'

export interface PollComment {
  id: string
  user_id: string
  comment: string
  created_at: string
  username: string | null
  agree_count: number
  disagree_count: number
  tips_received: number
  user_reaction: CommentReaction | null
}
