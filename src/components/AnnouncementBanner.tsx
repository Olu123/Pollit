'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

interface Announcement {
  id: string
  message: string
}

const DISMISSED_KEY = 'pollit_dismissed_announcements'

function getDismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]') } catch { return [] }
}
function setDismissed(ids: string[]) {
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids))
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('announcements')
        .select('id, message')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!data) return
      const dismissed = getDismissed()
      if (!dismissed.includes(data.id)) {
        setAnnouncement(data as Announcement)
      }
    }
    load()
  }, [])

  function dismiss() {
    if (!announcement) return
    const dismissed = getDismissed()
    setDismissed([...dismissed, announcement.id])
    setAnnouncement(null)
  }

  if (!announcement) return null

  return (
    <div className="bg-[#DC2626] text-white px-4 py-2.5 flex items-center gap-3 text-sm font-medium">
      <span className="shrink-0">📢</span>
      <span className="flex-1">{announcement.message}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
