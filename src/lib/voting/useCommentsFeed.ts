import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PollComment } from '@/lib/types'

// Loads and holds the comment feed for a poll. `reload` is exposed so the
// realtime subscription (owned by the caller, alongside the poll's other
// live-updating fields) can refresh it when a new commented vote comes in.
export function useCommentsFeed(pollId: string) {
  const [comments, setComments] = useState<PollComment[]>([])

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select('id, comment, created_at, profile:profiles!user_id ( username )')
      .eq('poll_id', pollId)
      .not('comment', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: PollComment[] = (data ?? []).map((row: any) => {
      const prof = Array.isArray(row.profile) ? row.profile[0] : row.profile
      return {
        id: row.id,
        comment: row.comment,
        created_at: row.created_at,
        username: prof?.username ?? null,
      }
    })
    setComments(mapped)
  }, [pollId])

  useEffect(() => { reload() }, [reload])

  return { comments, reload }
}
