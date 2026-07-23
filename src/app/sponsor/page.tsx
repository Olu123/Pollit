import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Partnerships — WePollit',
  description: 'WePollit sponsorship and partnership opportunities coming soon.',
}

export default function SponsorPage() {
  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center gap-6 animate-fade-in-up">
      <div className="w-14 h-14 rounded-2xl bg-[#DC2626]/10 flex items-center justify-center">
        <Mail size={24} className="text-[#DC2626]" strokeWidth={2.25} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-foreground">Sponsorship &amp; Partnerships</h1>

      <div className="flex flex-col gap-4 text-[15px] text-foreground/80 leading-relaxed">
        <p>WePollit is currently in beta.</p>
        <p>
          We are focused on building Nigeria&rsquo;s most trusted public opinion platform before opening
          sponsorship opportunities formally.
        </p>
        <p>
          If you are interested in partnering with WePollit — whether as a sponsor, research partner, NGO or
          media house — we&rsquo;d love to hear from you early.
        </p>
        <p className="font-semibold text-foreground">
          Contact: <a href="mailto:hello@wepollit.com" className="text-[#DC2626] hover:underline">hello@wepollit.com</a>
        </p>
      </div>

      <Link
        href="/contact"
        className="inline-flex items-center gap-2 bg-[#DC2626] text-white font-bold text-sm px-6 min-h-[48px] rounded-full hover:brightness-95 active:scale-95 transition-all"
      >
        <Mail size={16} strokeWidth={2.5} /> Contact Us
      </Link>
    </main>
  )
}
