import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/components/AuthProvider'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pollit — Have your say. Pave the way.',
  description:
    'Vote on what matters to Nigerians. Share your opinion on politics, sports, entertainment, business, and more.',
  keywords: ['Nigeria', 'polling', 'vote', 'opinion', 'Pollit'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased font-sans">
        <AuthProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Pollit
          </footer>
        </AuthProvider>
      </body>
    </html>
  )
}
