import { BookX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OutstandingCourse } from "../types"

// Only consumer of the carryover-reason enum outside registration, so the
// labels live here rather than in lib/outcome.ts.
const CARRYOVER_REASON_LABELS: Record<OutstandingCourse["reason"], string> = {
  FAILED: "Failed",
  NOT_TAKEN: "Not taken",
}

interface OutstandingCoursesListProps {
  courses: OutstandingCourse[]
  /** Copy for the empty state. */
  emptyMessage?: string
  className?: string
}

// The backend's derived carryovers, listed as returned. Nothing is computed.
export function OutstandingCoursesList({
  courses,
  emptyMessage = "No outstanding courses.",
  className,
}: OutstandingCoursesListProps) {
  if (courses.length === 0) {
    return (
      <p
        className={cn(
          "rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      {courses.map((c) => (
        <li
          key={c.course.id}
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <BookX
              size={14}
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                <span className="font-mono">{c.course.code}</span> ·{" "}
                {c.course.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.course.credit_units} unit
                {c.course.credit_units === 1 ? "" : "s"}
                {c.last_attempt_session
                  ? ` · last attempted ${c.last_attempt_session}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                c.reason === "FAILED"
                  ? "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
              )}
            >
              {CARRYOVER_REASON_LABELS[c.reason]}
            </Badge>
            {c.offering_missing && (
              <Badge
                variant="outline"
                className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              >
                Not offered this semester
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
