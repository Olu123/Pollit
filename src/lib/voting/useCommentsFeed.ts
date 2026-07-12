import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CommentReaction, PollComment } from '@/lib/types'

// Loads and holds the comment feed for a poll. `reload` is exposed so the
// realtime subscription (owned by the caller, alongside the poll's other
// live-updating fields) can refresh it when a new commented vote, reaction,
// or tip comes in. `userId` is used to look up the viewer's own reaction
// per comment (agree/disagree buttons need to render their active state).
export function useCommentsFeed(pollId: string, userId?: string) {
  const [comments, setComments] = useState<PollComment[]>([])

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select(`
        id, user_id, comment, created_at,
        agree_count, disagree_count, tips_received,
        profile:profiles!user_id ( username )
      `)
      .eq('poll_id', pollId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = data ?? []

    let myReactions = new Map<string, CommentReaction>()
    if (userId && rows.length > 0) {
      const { data: reactions } = await supabase
        .from('comment_reactions')
        .select('vote_id, reaction')
        .eq('user_id', userId)
        .in('vote_id', rows.map((r) => r.id))
      myReactions = new Map((reactions ?? []).map((r) => [r.vote_id, r.reaction as CommentReaction]))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: PollComment[] = rows.map((row: any) => {
      const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
      return {
        id: row.id,
        user_id: row.user_id,
        comment: row.comment,
        created_at: row.created_at,
        username: prof?.username ?? null,
        agree_count: row.agree_count ?? 0,
        disagree_count: row.disagree_count ?? 0,
        tips_received: row.tips_received ?? 0,
        user_reaction: myReactions.get(row.id) ?? null,
      }
    })
    setComments(mapped)
  }, [pollId, userId])

  useEffect(() => { reload() }, [reload])

  return { comments, reload }
}
