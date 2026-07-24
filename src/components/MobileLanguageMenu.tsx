'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { analytics } from '@/lib/analytics'
import type { Lang } from '@/lib/i18n'

const OPTIONS: { value: Lang; code: string; emoji: string; label: string }[] = [
  { value: 'en',  code: 'EN',  emoji: '🇬🇧', label: 'English' },
  { value: 'pid', code: 'PID', emoji: '🇳🇬', label: 'Pidgin' },
  { value: 'hau', code: 'HAU', emoji: '🌙', label: 'Hausa (هَوْسَ)' },
  { value: 'yor', code: 'YOR', emoji: '🌿', label: 'Yoruba' },
  { value: 'ibo', code: 'IBO', emoji: '🦅', label: 'Igbo' },
]

// Compact language switcher for the mobile top bar — a full 5-way pill row
// (see LanguageToggle.tsx, still used on desktop) doesn't fit there, so
// this shows only the current code and opens a dropdown of full names.
export default function MobileLanguageMenu() {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((o) => o.value === lang) ?? OPTIONS[0]

  function choose(next: Lang) {
    setLang(next)
    analytics.languageChanged(next)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        className="flex items-center gap-1 h-11 px-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-bold"
      >
        <Globe size={16} strokeWidth={2.25} />
        {current.code}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-52 bg-card border border-border rounded-xl shadow-lg py-1.5">
            {OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                onClick={() => choose(value)}
                aria-pressed={lang === value}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors text-left ${
                  lang === value ? 'text-[#DC2626] bg-[#DC2626]/5' : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-base leading-none">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
