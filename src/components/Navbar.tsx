'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, BarChart2, LogOut, Star, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { user, profile } = useAuth()

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
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          onClick={() => setOpen(false)}
        >
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
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150 ${
                pathname === href
                  ? 'text-primary bg-primary-light'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/create"
            className="ml-3 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-primary-dark transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Create Poll
          </Link>

          {user ? (
            <div className="ml-2 flex items-center gap-2">
              {profile && (
                <div className="flex items-center gap-1 bg-primary-light text-primary text-xs font-semibold px-2.5 py-1.5 rounded-full">
                  <Star size={11} strokeWidth={2.5} />
                  <span>{profile.points.toLocaleString()} tokens</span>
                </div>
              )}
              <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 text-sm font-medium px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile right — points pill + create + hamburger (all 44×44px) */}
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
            aria-label="Create poll"
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
          {NAV_LINKS.map(({ href, label }) => (
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
              {label}
            </Link>
          ))}
          {user ? (
            <>
              {displayName && (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Signed in as{' '}
                  <span className="font-semibold text-foreground">{displayName}</span>
                </p>
              )}
              <button
                onClick={() => { signOut(); setOpen(false) }}
                className="flex items-center gap-2.5 text-sm font-medium px-3 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left w-full"
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center text-sm font-medium px-3 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
