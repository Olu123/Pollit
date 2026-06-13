import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us — WePollit',
  description: "Get in touch with the WePollit team. We'd love to hear from you.",
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
