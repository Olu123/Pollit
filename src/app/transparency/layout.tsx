import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Token Transparency — Public Ledger',
  description: 'Every WePollit token transaction is public. View our fully transparent token ledger, supply overview and distribution history.',
}

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return children
}
