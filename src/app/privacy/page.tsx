import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy — WePollit' }

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-3xl">🔒</div>
      <h1 className="text-2xl font-black text-foreground">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Our full privacy policy is coming soon. In the meantime, we only collect what we need to run
        WePollit and never sell your data. Questions? <Link href="/contact" className="text-primary font-semibold">Contact us</Link>
      </p>
      <Link href="/guidelines" className="text-sm font-semibold text-primary hover:text-primary-dark">
        Read our Community Guidelines →
      </Link>
    </main>
  )
}
