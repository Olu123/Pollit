'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, BarChart2, TrendingUp, Flag, UserPlus, Loader2 } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
} from 'recharts'

interface Stats {
  users: number
  polls: number
  votes: number
  reports: number
  newToday: number
  newWeek: number
  topPoll: { question: string; total_votes: number } | null
}

interface ChartPoint { date: string; users: number; votes: number }
interface RecentPoll  { id: string; question: string; category: string; total_votes: number; created_at: string }

export default function AdminOverviewPage() {
  const [stats,       setStats]       = useState<Stats | null>(null)
  const [chart,       setChart]       = useState<ChartPoint[]>([])
  const [recent,      setRecent]      = useState<RecentPoll[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      const now   = new Date()
      const today = new Date(now); today.setHours(0, 0, 0, 0)
      const week  = new Date(now); week.setDate(week.getDate() - 7)
      const two   = new Date(now); two.setDate(two.getDate() - 14)

      const [
        { count: users },
        { count: polls },
        { count: reports },
        { data: pollTotals },
        { count: newToday },
        { count: newWeek },
        { data: topPolls },
        { data: recentProfiles },
        { data: recentVoteRows },
        { data: recentPolls },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('polls').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('polls').select('total_votes').is('deleted_at', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', week.toISOString()),
        supabase.from('polls').select('question, total_votes').is('deleted_at', null).gte('created_at', week.toISOString()).order('total_votes', { ascending: false }).limit(1),
        supabase.from('profiles').select('created_at').gte('created_at', two.toISOString()),
        supabase.from('votes').select('created_at').gte('created_at', two.toISOString()),
        supabase.from('polls').select('id, question, category, total_votes, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(6),
      ])

      const votes = (pollTotals ?? []).reduce((s: number, p: { total_votes: number }) => s + (p.total_votes ?? 0), 0)

      setStats({
        users:    users    ?? 0,
        polls:    polls    ?? 0,
        votes,
        reports:  reports  ?? 0,
        newToday: newToday ?? 0,
        newWeek:  newWeek  ?? 0,
        topPoll:  topPolls?.[0] ?? null,
      })

      // Build 14-day chart
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - (13 - i))
        d.setHours(0, 0, 0, 0)
        return d
      })
      setChart(days.map(day => {
        const ds = day.toDateString()
        return {
          date:  day.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
          users: (recentProfiles ?? []).filter(r => new Date(r.created_at).toDateString() === ds).length,
          votes: (recentVoteRows ?? []).filter(r => new Date(r.created_at).toDateString() === ds).length,
        }
      }))

      setRecent((recentPolls ?? []) as RecentPoll[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-primary" /></div>
  }

  const s = stats!

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 max-w-6xl">
      <h1 className="text-xl font-black text-foreground">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={18} className="text-primary" />}        value={s.users.toLocaleString()}   label="Total Users"    />
        <StatCard icon={<BarChart2 size={18} className="text-primary" />}    value={s.polls.toLocaleString()}   label="Total Polls"    />
        <StatCard icon={<TrendingUp size={18} className="text-primary" />}   value={s.votes.toLocaleString()}   label="Total Votes"    />
        <StatCard icon={<Flag size={18} className="text-[#DC2626]" />}       value={s.reports.toLocaleString()} label="Open Reports"   color="red" />
      </div>

      {/* New users + top poll */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <UserPlus size={15} className="text-primary" /> New Users
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-2xl font-black text-foreground">{s.newToday}</p>
              <p className="text-xs text-muted-foreground">today</p>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{s.newWeek}</p>
              <p className="text-xs text-muted-foreground">this week</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
          <p className="text-sm font-bold text-foreground">🔥 Top Poll This Week</p>
          {s.topPoll ? (
            <>
              <p className="text-sm text-foreground/90 line-clamp-2">{s.topPoll.question}</p>
              <p className="text-xs text-muted-foreground">{s.topPoll.total_votes.toLocaleString()} votes</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No polls this week yet.</p>
          )}
        </div>
      </div>

      {/* Growth chart */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-sm font-bold text-foreground mb-4">Growth — last 14 days</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chart}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="users" stroke="#16a34a" name="New Users" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="votes" stroke="#DC2626" name="Votes"     dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent polls */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">Recent Polls</p>
        </div>
        <div className="divide-y divide-border">
          {recent.map(p => (
            <div key={p.id} className="px-4 py-3 flex items-center gap-3">
              <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{p.category}</span>
              <span className="text-sm text-foreground flex-1 line-clamp-1">{p.question}</span>
              <span className="text-xs text-muted-foreground shrink-0">{p.total_votes} votes</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(p.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="text-sm text-muted-foreground px-4 py-6 text-center">No polls yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon, value, label, color = 'default',
}: {
  icon: React.ReactNode; value: string; label: string; color?: 'default' | 'red'
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        {icon}
      </div>
      <p className={`text-2xl font-black tabular-nums ${color === 'red' ? 'text-[#DC2626]' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
