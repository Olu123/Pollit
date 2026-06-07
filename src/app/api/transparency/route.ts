import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { TOTAL_SUPPLY } from '@/lib/transparency'

// Public transparency endpoint. Revalidate hint + an explicit Cache-Control so
// the CDN serves a cached copy for 60s (supabase-js's internal fetch otherwise
// forces this route to render dynamically on every request).
export const revalidate = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

export async function GET() {
  const [
    { data: supplyRows },
    { count: totalUsers },
    { count: totalTransactions },
    { count: totalVotes },
    { count: totalPolls },
    { data: recent },
  ] = await Promise.all([
    supabase.rpc('transparency_supply'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('token_transactions').select('id', { count: 'exact', head: true }),
    supabase.from('votes').select('id', { count: 'exact', head: true }),
    supabase.from('polls').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('token_transactions')
      .select('id, user_id, username, amount, reason, reason_type, poll_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const supply = Array.isArray(supplyRows) ? supplyRows[0] : supplyRows
  const distributed = Number(supply?.distributed ?? 0)
  const circulating = Number(supply?.circulating ?? 0)
  const remaining = TOTAL_SUPPLY - distributed

  const body = {
    supply: {
      total: TOTAL_SUPPLY,
      distributed,
      circulating,
      remaining_reserve: remaining,
      percent_distributed: Math.round((distributed / TOTAL_SUPPLY) * 100 * 10000) / 10000,
    },
    stats: {
      total_users: totalUsers ?? 0,
      total_transactions: totalTransactions ?? 0,
      total_votes: totalVotes ?? 0,
      total_polls: totalPolls ?? 0,
    },
    recent_transactions: recent ?? [],
    generated_at: new Date().toISOString(),
  }

  return NextResponse.json(body, { headers: CORS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
