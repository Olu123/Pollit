// Account-age based permissions. Mirrors the server-side gates in the
// create_poll RPC (supabase/schema.sql) — keep the two in sync.

export function getAccountAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
}

export function getAccountAgeHours(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000)
}

// Poll creation (and commenting) unlock 1 hour after sign-up; the server
// enforces the same hour gate in the create_poll RPC. `ageHours` defaults to
// ageDays * 24 so callers that only have days still get a sane answer.
export function getAccountPermissions(
  ageDays: number,
  points: number,
  ageHours: number = ageDays * 24,
) {
  return {
    canVote: true, // always
    canCreatePoll: ageHours >= 1,
    canComment: ageHours >= 1,
    canCreateHotTake: ageDays >= 30 && points >= 100,
    canCreateCommunityPoll: ageDays >= 7,
    canCreateChallenge: false, // admin only
    maxPollsPerDay: ageHours < 1 ? 0 : ageDays < 7 ? 2 : 5,
    canReferFriends: ageDays >= 3,
  }
}
