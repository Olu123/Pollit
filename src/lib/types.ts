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
  created_at: string
  profile: Profile | null
  options: PollOption[]
}

export interface Vote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  comment: string | null
  created_at: string
}

export interface PollComment {
  id: string
  comment: string
  created_at: string
  username: string | null
}
