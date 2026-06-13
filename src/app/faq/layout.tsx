import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions',
  description: "Everything you need to know about WePollit — Nigeria's people-powered polling platform. Learn about tokens, voting, challenges and more.",
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
