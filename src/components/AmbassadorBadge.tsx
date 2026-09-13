// Small green pill shown next to a username wherever a campus ambassador
// is identified (poll cards, comments, leaderboard). Renders nothing for
// non-ambassadors so callers can use it unconditionally.
export default function AmbassadorBadge({
  isAmbassador,
  className = '',
}: {
  isAmbassador: boolean | null | undefined
  className?: string
}) {
  if (!isAmbassador) return null
  return (
    <span
      className={`inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${className}`}
    >
      🎓 Campus Ambassador
    </span>
  )
}
