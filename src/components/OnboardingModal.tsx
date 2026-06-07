'use client'

import { useState } from 'react'
import { BarChart2, Search, Vote, Flame, AlertTriangle } from 'lucide-react'
import { useLanguage } from './LanguageProvider'

const GUIDELINES = [
  'Vote honestly — your opinion is your power',
  'Keep comments respectful and constructive',
  'No hate speech, tribalism or discrimination',
  'No spam or fake polls',
  'One account per person',
  'Polls must be genuine questions, not statements disguised as polls',
  'Respect others even when you disagree',
]

export default function OnboardingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useLanguage()
  const en = lang === 'en'
  const [slide, setSlide] = useState(0)

  if (!open) return null

  const next = () => (slide < 3 ? setSlide(slide + 1) : onClose())

  return (
    <div className="fixed inset-0 z-[95] bg-gray-950/70 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl shadow-xl flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
              <BarChart2 size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black tracking-tight">
              <span className="text-foreground font-black">We</span><span className="text-muted-foreground font-black">+</span><span className="text-foreground font-black">Poll</span><span className="text-muted-foreground font-black">+</span><span className="text-[#DC2626] font-black">it</span>
            </span>
          </div>
          <button onClick={onClose} aria-label="Skip" className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1">
            {en ? 'Skip' : 'Comot'}
          </button>
        </div>

        {/* Slide body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {slide === 0 && (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center text-4xl">🗳️</div>
              <h2 className="text-2xl font-black text-foreground">{en ? 'Welcome to WePollit' : 'Welcome Enter WePollit'}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {en
                  ? "Nigeria's home for honest public opinion. Your voice matters here — from politics and sports to entertainment and everyday life."
                  : 'Naija home for real talk. Your voice important here — from politics and sports to enjoyment and everyday life.'}
              </p>
            </div>
          )}

          {slide === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-xl font-black text-foreground text-center">{en ? 'How It Works' : 'How E Dey Work'}</h2>
              <Step icon={<Search size={18} />} title={en ? 'Discover' : 'Discover'} body={en
                ? 'Browse polls on topics that matter to you. Filter by Politics, Sports, Entertainment, Business or Lifestyle.'
                : 'Find polls for tins wey matter to you.'} />
              <Step icon={<Vote size={18} />} title={en ? 'Vote' : 'Vote'} body={en
                ? 'Cast your vote, add a comment, and see how Nigeria voted — broken down by state.'
                : 'Drop your vote, talk your mind, see how Naija vote.'} />
              <Step icon={<Flame size={18} />} title={en ? 'Share' : 'Share'} body={en
                ? 'Share results on WhatsApp, climb the leaderboard, and earn tokens for every vote and poll you create.'
                : 'Share result for WhatsApp, climb ranking, earn tokens.'} />
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 text-xs font-medium">
                <span className="shrink-0">⏳</span>
                <span>
                  {en
                    ? 'Note: Poll creation unlocks 1 hour after sign-up — this helps keep WePollit genuine.'
                    : 'Note: You fit make poll 1 hour after you sign up — e dey help us keep WePollit real.'}
                </span>
              </div>
            </div>
          )}

          {slide === 2 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">📋 {en ? 'Community Guidelines' : 'Community Guidelines'}</h2>
              <ul className="flex flex-col gap-2.5">
                {GUIDELINES.map((g) => (
                  <li key={g} className="flex items-start gap-2.5 text-sm text-foreground/85">
                    <span className="shrink-0">✅</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2.5 mt-1 text-sm font-semibold">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                Violations may result in account suspension
              </div>
            </div>
          )}

          {slide === 3 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-black text-foreground">📋 {en ? 'One Important Thing' : 'One Important Tin'}</h2>
              <p className="text-sm text-muted-foreground">
                {en
                  ? 'Before you start, please ensure your profile reflects your correct details.'
                  : 'Before you start, abeg make sure your profile correct.'}
              </p>
              <p className="text-xs text-muted-foreground">
                {en
                  ? 'You can update your profile at any time from your Profile page.'
                  : 'You fit update your profile anytime from your Profile page.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer: dots + next */}
        <div className="px-6 pb-6 pt-2 flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-[#DC2626]' : 'w-2 bg-border'}`} />
            ))}
          </div>
          <button
            onClick={next}
            className="w-full bg-[#DC2626] text-white font-bold text-base py-4 min-h-[56px] rounded-xl hover:brightness-95 active:scale-[0.98] transition-all"
          >
            {slide < 3 ? (en ? 'Next' : 'Next') : (en ? "Let's Go! 🗳️" : 'Make We Start! 🗳️')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground leading-snug">{body}</p>
      </div>
    </div>
  )
}
