import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { semesterLockedReason } from "../../lib/results-errors"

// "Semester locked" chip (B30 item 13): icon + text, so it never relies on
// colour alone. The full reason (with the lock date) is in the title and
// read out to screen readers.
export function SemesterLockBadge({
  lockedAt,
  className,
}: {
  lockedAt: string | null
  className?: string
}) {
  const reason = semesterLockedReason(lockedAt)
  return (
    <span
      title={reason}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-zinc-800 dark:bg-zinc-700/60 dark:text-zinc-100",
        className
      )}
    >
      <Lock className="size-3" aria-hidden />
      Semester locked
      <span className="sr-only">. {reason}</span>
    </span>
  )
}
