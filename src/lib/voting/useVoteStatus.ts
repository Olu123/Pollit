import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Looks up whether the current user already voted on this poll, so the
// panel can render results instead of the option list on load.
export function useVoteStatus(pollId: string, userId: string | undefined) {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null)
  const [votedAt, setVotedAt] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!userId) { setChecked(true); return }
    supabase
      .from('votes')
      .select('option_id, created_at')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setVotedOptionId(data.option_id as string)
          setVotedAt(new Date(data.created_at as string).getTime())
        }
        setChecked(true)
      })
  }, [pollId, userId])

  return { votedOptionId, votedAt, checked, setVotedOptionId, setVotedAt }
}
