'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, BarChart2, Flag, Mail,
  Coins, Megaphone, ArrowLeft, Menu, Shield, Loader2, Siren,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

const NAV = [
  { href: '/admin',               icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/users',         icon: Users,           label: 'Users' },
  { href: '/admin/polls',         icon: BarChart2,       label: 'Polls' },
  { href: '/admin/flags',         icon: Siren,           label: 'Flags' },
  { href: '/admin/reports',       icon: Flag,            label: 'Reports' },
  { href: '/admin/messages',      icon: Mail,            label: 'Messages' },
  { href: '/admin/tokens',        icon: Coins,           label: 'Tokens' },
  { href: '/admin/announcements', icon: Megaphone,       label: 'Announcements' },
]

function SidebarContent({ pathname, onClose, flagCount }: { pathname: string; onClose: () => void; flagCount: number }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border shrink-0">
        <div className="w-7 h-7 bg-[#DC2626] rounded-lg flex items-center justify-center shrink-0">
          <Shield size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-black text-sm text-foreground">Admin Panel</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={15} strokeWidth={2} />
              <span className="flex-1">{label}</span>
              {label === 'Flags' && flagCount > 0 && (
                <span className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                  active ? 'bg-white text-primary' : 'bg-[#DC2626] text-white'
                }`}>
                  {flagCount > 99 ? '99+' : flagCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border shrink-0">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Pollit
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [flagCount, setFlagCount] = useState(0)

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) router.replace('/')
  }, [loading, user, profile, router])

  useEffect(() => {
    if (!profile?.is_admin) return
    let active = true
    supabase
      .from('suspicious_flags')
      .select('id', { count: 'exact', head: true })
      .eq('resolved', false)
      .then(({ count }) => { if (active) setFlagCount(count ?? 0) })
    return () => { active = false }
  }, [profile?.is_admin, pathname])

  if (loading || !profile?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    )
  }

  const currentLabel = NAV.find(n => n.href === pathname)?.label ?? 'Admin'

  return (
    <div className="flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-card sticky top-16 h-[calc(100vh-64px)]">
        <SidebarContent pathname={pathname} onClose={() => {}} flagCount={flagCount} />
      </aside>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-gray-950/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-56 bg-card border-r border-border transition-transform duration-200 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent pathname={pathname} onClose={() => setDrawerOpen(false)} flagCount={flagCount} />
      </aside>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-border bg-card shrink-0 sticky top-14 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="font-bold text-sm text-foreground">{currentLabel}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
