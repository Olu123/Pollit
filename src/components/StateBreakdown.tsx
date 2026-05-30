'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { colorOf, zoneOf, isNorth } from '@/lib/states'
import { useLanguage } from './LanguageProvider'
import type { Poll } from '@/lib/types'

interface StateRow {
  state: string
  total: number
  winningOption: string
  winningCount: number
}

export default function StateBreakdown({ poll }: { poll: Poll }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [rows, setRows] = useState<StateRow[]>([])
  const [insight, setInsight] = useState<string | null>(null)

  const optionText = useCallback(
    (id: string) => poll.options.find((o) => o.id === id)?.text ?? '—',
    [poll.options]
  )

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select('option_id, state')
      .eq('poll_id', poll.id)
      .not('state', 'is', null)
      .limit(5000)

    const byState = new Map<string, Map<string, number>>()
    ;(data ?? []).forEach((v) => {
      if (!v.state) return
      const m = byState.get(v.state) ?? new Map<string, number>()
      m.set(v.option_id, (m.get(v.option_id) ?? 0) + 1)
      byState.set(v.state, m)
    })

    const result: StateRow[] = []
    for (const [state, counts] of byState) {
      let total = 0
      let winId = ''
      let winCount = -1
      for (const [optId, c] of counts) {
        total += c
        if (c > winCount) { winCount = c; winId = optId }
      }
      result.push({ state, total, winningOption: optionText(winId), winningCount: winCount })
    }
    result.sort((a, b) => b.total - a.total)

    // Insight: does the North favour a different option than the South?
    const northWin = new Map<string, number>()
    const southWin = new Map<string, number>()
    result.forEach((r) => {
      const bucket = isNorth(r.state) ? northWin : southWin
      bucket.set(r.winningOption, (bucket.get(r.winningOption) ?? 0) + r.total)
    })
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const nTop = top(northWin)
    const sTop = top(southWin)
    if (nTop && sTop && nTop !== sTop) {
      setInsight('This poll shows a clear North–South divide. 🤔')
    } else if (result.length >= 3) {
      setInsight('States across Nigeria largely agree on this one. 🤝')
    } else {
      setInsight(null)
    }

    setRows(result.slice(0, 10))
    setLoaded(true)
  }, [poll.id, optionText])

  useEffect(() => {
    if (open && !loaded) load()
  }, [open, loaded, load])

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 min-h-[52px] text-sm font-bold text-foreground hover:bg-muted/50 transition-colors"
        aria-expanded={open}
      >
        <span>{t('state.see')}</span>
        <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
          {!loaded ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No state data yet — be the first to add your state when you vote.
            </p>
          ) : (
            <>
              {insight && (
                <p className="text-sm font-semibold text-foreground bg-muted rounded-lg px-3 py-2">{insight}</p>
              )}
              <div className="flex flex-col gap-2.5">
                {rows.map((r) => {
                  const max = rows[0].total || 1
                  return (
                    <div key={r.state} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorOf(r.state) }}
                        title={zoneOf(r.state) ?? ''}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-semibold text-foreground">{r.state}</span>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            {r.total} {r.total === 1 ? 'vote' : 'votes'}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full animate-bar"
                            style={{ width: `${Math.round((r.total / max) * 100)}%`, backgroundColor: colorOf(r.state) }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {t('state.winning')}: <span className="text-foreground/80 font-medium">{r.winningOption}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
