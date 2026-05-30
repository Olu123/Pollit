// Tiny offline queue for votes cast while disconnected.
// Persisted in localStorage; flushed on reconnect / background sync.

const KEY = 'pollit_pending_votes'

export interface PendingVote {
  poll_id: string
  option_id: string
  comment: string | null
}

function read(): PendingVote[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function write(list: PendingVote[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function enqueueVote(v: PendingVote) {
  const list = read().filter((p) => p.poll_id !== v.poll_id)
  list.push(v)
  write(list)
}

export function getPendingVotes(): PendingVote[] {
  return read()
}

export function removePendingVote(pollId: string) {
  write(read().filter((p) => p.poll_id !== pollId))
}

export function hasPendingVote(pollId: string): boolean {
  return read().some((p) => p.poll_id === pollId)
}
