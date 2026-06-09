import { posthog } from './posthog'

export const analytics = {
  // Poll events
  pollViewed: (pollId: string, category: string, isChallenge: boolean) => {
    posthog?.capture('poll_viewed', {
      poll_id: pollId,
      category,
      is_challenge: isChallenge,
    })
  },

  pollVoted: (pollId: string, category: string, hasComment: boolean, state: string | null) => {
    posthog?.capture('poll_voted', {
      poll_id: pollId,
      category,
      has_comment: hasComment,
      state,
    })
  },

  pollCreated: (category: string, isHotTake: boolean, isCommunity: boolean, isChallenge: boolean) => {
    posthog?.capture('poll_created', {
      category,
      is_hot_take: isHotTake,
      is_community: isCommunity,
      is_challenge: isChallenge,
    })
  },

  pollShared: (pollId: string, platform: string) => {
    posthog?.capture('poll_shared', {
      poll_id: pollId,
      platform,
    })
  },

  // User events
  userSignedUp: (method: string) => {
    posthog?.capture('user_signed_up', { method })
  },

  userSignedIn: (method: string) => {
    posthog?.capture('user_signed_in', { method })
  },

  // Challenge events
  challengeJoined: (pollId: string, pool: number) => {
    posthog?.capture('challenge_joined', {
      poll_id: pollId,
      pool_size: pool,
    })
  },

  // Navigation events
  leaderboardViewed: () => {
    posthog?.capture('leaderboard_viewed')
  },

  pulseViewed: () => {
    posthog?.capture('pulse_viewed')
  },

  transparencyViewed: () => {
    posthog?.capture('transparency_viewed')
  },

  faqViewed: () => {
    posthog?.capture('faq_viewed')
  },

  // Referral events
  referralLinkCopied: () => {
    posthog?.capture('referral_link_copied')
  },

  // Language events
  languageChanged: (language: string) => {
    posthog?.capture('language_changed', { language })
  },
}
