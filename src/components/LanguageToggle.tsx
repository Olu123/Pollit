'use client'

import { useLanguage } from './LanguageProvider'

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center rounded-full bg-muted p-0.5 text-xs font-bold select-none">
      <button
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === 'en' ? 'bg-[#DC2626] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('pid')}
        aria-pressed={lang === 'pid'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          lang === 'pid' ? 'bg-[#DC2626] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        PID
      </button>
    </div>
  )
}
