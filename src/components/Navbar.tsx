'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, BarChart2, LogOut, Coins, Plus, User as UserIcon, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'
import { useLanguage } from './LanguageProvider'
import LanguageToggle from './LanguageToggle'
import type { StringKey } from '@/lib/i18n'

const NAV_LINKS: { href: string; key: StringKey }[] = [
  { href: '/', key: 'nav.home' },
  { href: '/pulse', key: 'nav.pulse' },
  { href: '/leaderboard', key: 'nav.leaderboard' },
  { href: '/invite', key: 'nav.invite' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, profile } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const displayName =
    profile?.username ??
    user?.user_metadata?.name ??
    user?.email?.split('@')[0] ??
    user?.phone ??
    null

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav
      className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-shadow duration-300 ${
        scrolled ? 'shadow-sm' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
            <BarChart2 size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tight">
            <span className="text-foreground">Poll</span>
            <span className="text-[#DC2626]">+it</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, key }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`relative text-sm font-medium px-3 py-2 transition-colors duration-150 ${
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(key)}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-[2px] h-0.5 rounded-full bg-[#DC2626]" />
                )}
              </Link>
            )
          })}
          <Link
            href="/create"
            className="ml-3 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-primary-dark active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('nav.create')}
          </Link>

          <div className="ml-2"><LanguageToggle /></div>

          {user ? (
            <div className="ml-2 flex items-center gap-2">
              {profile && (
                <div className="flex items-center gap-1 bg-primary-light text-primary text-xs font-semibold px-2.5 py-1.5 rounded-full">
                  <Coins size={11} strokeWidth={2.5} />
                  <span>{profile.points.toLocaleString()} {t('lb.tokens')}</span>
                </div>
              )}
              <Link
                href="/profile"
                className="text-sm font-medium text-foreground max-w-[120px] truncate hover:text-primary transition-colors"
                title={t('nav.profile')}
              >
                {displayName}
              </Link>
              {profile?.is_admin && (
                <Link
                  href="/admin/messages"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Admin"
                >
                  <Settings size={16} />
                </Link>
              )}
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={t('nav.logout')}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 text-sm font-medium px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>

        {/* Mobile right — points pill + create + hamburger */}
        <div className="md:hidden flex items-center gap-1.5">
          {profile && (
            <div className="flex items-center gap-1 bg-primary-light text-primary text-xs font-semibold px-2.5 py-1.5 rounded-full leading-none">
              <Star size={10} strokeWidth={2.5} />
              <span>
                {profile.points >= 1000
                  ? `${(profile.points / 1000).toFixed(1)}k`
                  : profile.points}
              </span>
            </div>
          )}
          <Link
            href="/create"
            onClick={() => setOpen(false)}
            aria-label={t('nav.create')}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white hover:bg-primary-dark active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={19} strokeWidth={2.5} />
          </Link>
          <button
            className="flex items-center justify-center w-11 h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-2 flex flex-col">
          <div className="flex justify-between items-center px-3 py-2">
            <span className="text-xs text-muted-foreground">Language</span>
            <LanguageToggle />
          </div>
          {NAV_LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center text-sm font-medium px-3 py-3.5 rounded-xl transition-colors ${
                pathname === href
                  ? 'text-primary bg-primary-light'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {t(key)}
            </Link>
          ))}
          {user ? (
            <>
              {displayName && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {t('nav.signedInAs')}{' '}
                  <span className="font-semibold text-foreground">{displayName}</span>
                </p>
              )}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 text-sm font-medium px-3 py-3.5 rounded-xl transition-colors ${
                  pathname === '/profile'
                    ? 'text-primary bg-primary-light'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <UserIcon size={15} /> {t('nav.profile')}
              </Link>
              {profile?.is_admin && (
                <Link
                  href="/admin/messages"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 text-sm font-medium px-3 py-3.5 rounded-xl transition-colors ${
                    pathname === '/admin/messages'
                      ? 'text-primary bg-primary-light'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Settings size={15} /> ⚙️ Admin
                </Link>
              )}
              <button
                onClick={() => { signOut(); setOpen(false) }}
                className="flex items-center gap-2.5 text-sm font-medium px-3 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left w-full"
              >
                <LogOut size={15} /> {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center text-sm font-medium px-3 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
