'use client'

import { usePathname } from 'next/navigation'

// Re-mounts its children on every route change (keyed by pathname),
// re-triggering the fade-in animation for a smooth page transition.
export default function PageFade({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  return (
    <div key={pathname} className={`animate-fade-in ${className}`}>
      {children}
    </div>
  )
}
