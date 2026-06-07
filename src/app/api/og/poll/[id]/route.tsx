import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'
import type { Poll } from '@/lib/types'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data } = await supabase
    .from('polls')
    .select('question, total_votes, options:poll_options ( text, vote_count, display_order )')
    .eq('id', id)
    .single()

  const poll = data as unknown as Poll | null
  const question = poll?.question ?? 'Vote on WéPollit'
  const opts = (poll?.options ?? []).slice().sort((a, b) => b.vote_count - a.vote_count)
  const total = opts.reduce((s, o) => s + o.vote_count, 0)
  const top = opts.slice(0, 2).map((o) => ({
    text: o.text,
    pct: total > 0 ? Math.round((o.vote_count / total) * 100) : 0,
  }))

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '12px', background: '#DC2626' }} />

        {/* logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 56, height: 56, background: '#DC2626', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              <div style={{ width: 7, height: 14, background: '#fff', borderRadius: 2 }} />
              <div style={{ width: 7, height: 22, background: '#fff', borderRadius: 2 }} />
              <div style={{ width: 7, height: 30, background: '#fff', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 900 }}>
            <span style={{ color: '#171717' }}>WéPoll</span>
            <span style={{ color: '#DC2626' }}>it</span>
          </div>
        </div>

        {/* question */}
        <div style={{ display: 'flex', fontSize: 58, fontWeight: 900, color: '#171717', lineHeight: 1.15, marginTop: 40, flex: 1 }}>
          {question.length > 110 ? question.slice(0, 107) + '…' : question}
        </div>

        {/* options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
          {top.map((o, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#3f3f46' }}>
                <span>{o.text.length > 40 ? o.text.slice(0, 37) + '…' : o.text}</span>
                <span style={{ fontWeight: 800, color: '#171717' }}>{o.pct}%</span>
              </div>
              <div style={{ display: 'flex', height: 18, background: '#e4e4e7', borderRadius: 999 }}>
                <div style={{ width: `${o.pct}%`, height: 18, background: '#16a34a', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28 }}>
          <span style={{ color: '#71717a' }}>{total.toLocaleString()} votes</span>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>Vote now on WéPollit 🗳️</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
