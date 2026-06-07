import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms — WePollit' }

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center text-3xl">📄</div>
      <h1 className="text-2xl font-black text-foreground">Terms of Service</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Our full terms of service are coming soon. By using WePollit you agree to our
        Community Guidelines and to use the platform honestly and respectfully.
      </p>
      <Link href="/guidelines" className="text-sm font-semibold text-primary hover:text-primary-dark">
        Read our Community Guidelines →
      </Link>
    </main>
  )
}
