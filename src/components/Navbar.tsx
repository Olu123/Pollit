'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, BarChart2, LogOut, Star } from 'lucide-react'
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart2 size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-foreground tracking-tight">Agora</span>
          <span className="hidden sm:inline-block text-xs font-semibold bg-primary-light text-primary px-2 py-0.5 rounded-full leading-none">
            NG
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
                  <span>{profile.points.toLocaleString()} pts</span>
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

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium px-4 py-3 rounded-xl transition-colors ${
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
            onClick={() => setOpen(false)}
            className="mt-1 bg-primary text-white text-sm font-semibold px-4 py-3 rounded-xl text-center hover:bg-primary-dark transition-colors"
          >
            Create Poll
          </Link>
          {user ? (
            <>
              {profile && (
                <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-primary font-semibold">
                  <Star size={13} strokeWidth={2.5} />
                  {profile.points.toLocaleString()} pts
                </div>
              )}
              <button
                onClick={() => { signOut(); setOpen(false) }}
                className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm font-medium px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
