// Account-age based permissions. Mirrors the server-side gates in the
// create_poll RPC (supabase/schema.sql) — keep the two in sync.

export function getAccountAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
}

export function getAccountPermissions(ageDays: number, points: number) {
  return {
    canVote: true, // always
    canCreatePoll: ageDays >= 1,
    canComment: ageDays >= 1,
    canCreateHotTake: ageDays >= 30 && points >= 100,
    canCreateCommunityPoll: ageDays >= 7,
    canCreateChallenge: false, // admin only
    maxPollsPerDay: ageDays === 0 ? 0 : ageDays < 7 ? 2 : 5,
    canReferFriends: ageDays >= 3,
  }
}
