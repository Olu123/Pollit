import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/components/AuthProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ToastProvider } from '@/components/ToastProvider'
import PwaRegister from '@/components/PwaRegister'
import PageFade from '@/components/PageFade'
import ReferralTracker from '@/components/ReferralTracker'
import { OnboardingProvider } from '@/components/OnboardingProvider'
import SiteFooter from '@/components/SiteFooter'
import AnnouncementBanner from '@/components/AnnouncementBanner'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Pollit — Have your say. Pave the way.',
  description:
    'Vote on what matters to Nigerians. Share your opinion on politics, sports, entertainment, business, and more.',
  keywords: ['Nigeria', 'polling', 'vote', 'opinion', 'Pollit'],
  appleWebApp: { capable: true, title: 'Pollit', statusBarStyle: 'default' },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#DC2626',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col text-foreground antialiased font-sans">
        {/* Thin red accent bar at the very top */}
        <div className="h-1 bg-[#DC2626] w-full shrink-0" />

        <LanguageProvider>
          <ToastProvider>
          <AuthProvider>
            <OnboardingProvider>
              <Navbar />
              <AnnouncementBanner />
              <PageFade className="flex-1">{children}</PageFade>
              <SiteFooter />
              <PwaRegister />
              <ReferralTracker />
            </OnboardingProvider>
          </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
