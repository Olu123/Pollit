'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#DC2626', '#16a34a', '#fbbf24', '#2563eb', '#ffffff', '#22c55e']

interface Piece {
  left: number
  bg: string
  w: number
  h: number
  delay: number
  duration: number
  rounded: boolean
}

// Lightweight CSS confetti burst — no dependency. Renders once then self-clears.
export default function Confetti({ count = 90 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    setPieces(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        bg: COLORS[Math.floor(Math.random() * COLORS.length)],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.4,
        rounded: Math.random() > 0.5,
      }))
    )
    const t = setTimeout(() => setPieces([]), 4200)
    return () => clearTimeout(t)
  }, [count])

  if (pieces.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[70] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: '-5vh',
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.h}px`,
            backgroundColor: p.bg,
            borderRadius: p.rounded ? '9999px' : '2px',
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
