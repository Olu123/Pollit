'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Lang, type StringKey, translate, LANG_KEY } from '@/lib/i18n'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: StringKey) => string
}

const LanguageContext = createContext<LangState>({
  lang: 'en',
  setLang: () => {},
  t: (k) => translate(k, 'en'),
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start at 'en' so SSR and first client render agree (no hydration mismatch);
  // hydrate the saved preference right after mount.
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'pid' || saved === 'en') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    try { localStorage.setItem(LANG_KEY, l) } catch {}
  }

  const t = (key: StringKey) => translate(key, lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)

// Client island for translating a single string inside Server Components.
export function T({ k }: { k: StringKey }) {
  const { t } = useLanguage()
  return <>{t(k)}</>
}
