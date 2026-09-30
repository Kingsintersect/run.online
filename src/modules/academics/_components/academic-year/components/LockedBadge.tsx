import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface LockedBadgeProps {
  lockedAt: string | null | undefined
  className?: string
}

// B24.4 (bruno/academic/Sessions|Semesters - List.bru, 2026-09-28): sessions
// and semesters carry `lockedAt`, set once the Progression module locks them.
// Informational only; it doesn't disable any action here.
export function LockedBadge({ lockedAt, className }: LockedBadgeProps) {
  if (!lockedAt) return null
  const date = new Date(lockedAt)
  const when = Number.isNaN(date.getTime())
    ? lockedAt
    : date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400",
        className
      )}
      title={`Locked on ${when}`}
      aria-label={`Locked on ${when}`}
    >
      <Lock className="size-3" aria-hidden="true" />
      Locked
    </span>
  )
}
