import { supabase } from '@/lib/supabase'

export const MAX_POLL_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB
export const ACCEPTED_POLL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadPollImage(file: File, pollId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `polls/${pollId}.${ext}`
  const { error } = await supabase.storage
    .from('poll-images')
    .upload(path, file, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage
    .from('poll-images')
    .getPublicUrl(path)
  return data.publicUrl
}
