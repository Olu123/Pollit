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
import PostHogProvider from '@/components/PostHogProvider'
import SiteFooter from '@/components/SiteFooter'
import AnnouncementBanner from '@/components/AnnouncementBanner'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'WePollit — Have your say. Pave the way. Save the day.',
  description: "Nigeria's people-powered opinion platform",
  keywords: ['Nigeria', 'polling', 'vote', 'opinion', 'WePollit'],
  appleWebApp: { capable: true, title: 'WePollit', statusBarStyle: 'default' },
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
      <head>
        {/*
          Capture `beforeinstallprompt` as early as possible. On mobile Chrome this
          event fires during initial load — often before React hydrates and attaches
          its listener — so without this the deferred prompt is lost and the install
          button never appears. We stash the event on `window` and notify React.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              window.__wpInstallPrompt = window.__wpInstallPrompt || null;
              window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                window.__wpInstallPrompt = e;
                window.dispatchEvent(new Event('wp-install-available'));
              });
              window.addEventListener('appinstalled', function () {
                window.__wpInstallPrompt = null;
                window.dispatchEvent(new Event('wp-install-done'));
              });
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col text-foreground antialiased font-sans">
        {/* Thin red accent bar at the very top */}
        <div className="h-1 bg-[#DC2626] w-full shrink-0" />

        <LanguageProvider>
          <ToastProvider>
          <AuthProvider>
            <PostHogProvider>
              <OnboardingProvider>
                <Navbar />
                <AnnouncementBanner />
                <PageFade className="flex-1">{children}</PageFade>
                <SiteFooter />
                <PwaRegister />
                <ReferralTracker />
              </OnboardingProvider>
            </PostHogProvider>
          </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
