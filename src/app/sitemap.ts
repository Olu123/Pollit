import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

// Re-generate the sitemap at most hourly so newly created polls show up.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://wepollit.com'

  // Static pages
  const staticPages = [
    '',
    '/faq',
    '/transparency',
    '/leaderboard',
    '/challenges',
    '/pulse',
    '/sponsor',
    '/guidelines',
    '/contact',
    '/invite',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }))

  // Dynamic poll pages — public (non-community), non-deleted, newest first.
  const { data: polls } = await supabase
    .from('polls')
    .select('id, created_at')
    .eq('is_community', false)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  const pollPages = (polls ?? []).map((poll) => ({
    url: `${baseUrl}/polls/${poll.id}`,
    lastModified: new Date(poll.created_at),
    changeFrequency: 'hourly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...pollPages]
}
