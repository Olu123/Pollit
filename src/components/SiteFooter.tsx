'use client'

import Link from 'next/link'
import { useOnboarding } from './OnboardingProvider'

export default function SiteFooter() {
  const { openOnboarding } = useOnboarding()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border py-6 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>&copy; {year} Pollit</span>
        <span aria-hidden>·</span>
        <button onClick={openOnboarding} className="hover:text-foreground transition-colors">
          How it works
        </button>
        <span aria-hidden>·</span>
        <Link href="/guidelines" className="hover:text-foreground transition-colors">Guidelines</Link>
        <span aria-hidden>·</span>
        <Link href="/transparency" className="hover:text-foreground transition-colors">Transparency</Link>
        <span aria-hidden>·</span>
        <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
      </div>
    </footer>
  )
}
