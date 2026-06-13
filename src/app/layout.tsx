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
  metadataBase: new URL('https://wepollit.com'),
  title: {
    default: "WePollit — Nigeria's People-Powered Opinion Platform",
    template: '%s | WePollit',
  },
  description:
    'Vote on polls that matter to Nigeria. Share your opinion on politics, sports, entertainment and everyday life. See how Nigeria thinks — broken down by state.',
  keywords: [
    'Nigeria polls', 'Nigerian opinion', 'vote Nigeria',
    'Nigerian politics poll', 'Nigeria public opinion',
    'WePollit', 'Nigerian survey', 'Nigeria election poll',
    'Naija poll', 'Nigerian views',
  ],
  authors: [{ name: 'WePollit', url: 'https://wepollit.com' }],
  creator: 'WePollit',
  publisher: 'WePollit',
  appleWebApp: { capable: true, title: 'WePollit', statusBarStyle: 'default' },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://wepollit.com',
    siteName: 'WePollit',
    title: "WePollit — Nigeria's People-Powered Opinion Platform",
    description: 'Vote on polls that matter. See how Nigeria thinks.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "WePollit — Nigeria's Opinion Platform",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@WePollit',
    creator: '@WePollit',
    title: "WePollit — Nigeria's People-Powered Opinion Platform",
    description: 'Vote on polls that matter. See how Nigeria thinks.',
    images: ['/og-image.png'],
  },
  // NOTE: `alternates.canonical` is intentionally NOT set here. Metadata is
  // inherited by child routes, so a root canonical would point every page at
  // the homepage. Each page sets its own canonical instead (homepage below).
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE',
  },
}

export const viewport: Viewport = {
  themeColor: '#DC2626',
}

// Structured data — helps search engines understand the site + brand.
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'WePollit',
  url: 'https://wepollit.com',
  description: "Nigeria's people-powered public opinion platform",
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://wepollit.com/?category={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
  sameAs: ['https://twitter.com/WePollit'],
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'WePollit',
  url: 'https://wepollit.com',
  logo: 'https://wepollit.com/icon-512.png',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@wepollit.com',
    contactType: 'customer service',
  },
  sameAs: ['https://twitter.com/WePollit'],
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
        {/* Structured data (JSON-LD) for the site + organization. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
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
