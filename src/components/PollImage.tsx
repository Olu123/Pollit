'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

export default function PollImage({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="relative w-full aspect-video rounded-xl overflow-hidden cursor-zoom-in"
      >
        <Image src={src} alt={alt} fill priority sizes="(min-width: 640px) 700px, 100vw" className="object-cover" />
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[90] bg-gray-950/90 flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            aria-label="Close"
            className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="relative w-full h-full max-w-4xl">
            <Image src={src} alt={alt} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </>
  )
}
