import type { AdminRole } from '@/lib/types'

const STYLES: Record<AdminRole, string> = {
  super_admin: 'bg-primary/10 text-primary',
  moderator:   'bg-blue-100 text-blue-700',
  support:     'bg-zinc-100 text-zinc-600',
}

const LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  moderator:   'Moderator',
  support:     'Support',
}

export default function RoleBadge({ role }: { role: AdminRole | null | undefined }) {
  if (!role) return null
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STYLES[role]}`}>
      {LABELS[role]}
    </span>
  )
}
