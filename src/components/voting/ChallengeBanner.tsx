'use client'

import { Trophy } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export default function ChallengeBanner({ pool }: { pool: number }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-start gap-2.5 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-300 text-amber-800 rounded-xl px-4 py-3">
      <Trophy size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-amber-500" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide">{t('challenge.badge')}</p>
        <p className="text-sm font-semibold leading-snug">
          {t('challenge.banner')} {pool.toLocaleString()} {t('challenge.tokens')} 🪙
        </p>
      </div>
    </div>
  )
}
