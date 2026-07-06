'use client'

import { useLanguage } from './LanguageProvider'
import { analytics } from '@/lib/analytics'
import type { Lang } from '@/lib/i18n'

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en',  label: 'EN' },
  { value: 'pid', label: 'PID' },
  { value: 'hau', label: 'HAU' },
  { value: 'yor', label: 'YOR' },
  { value: 'ibo', label: 'IBO' },
]

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  function choose(next: Lang) {
    setLang(next)
    analytics.languageChanged(next)
  }

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5 text-xs font-bold select-none">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => choose(value)}
          aria-pressed={lang === value}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            lang === value ? 'bg-[#DC2626] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
