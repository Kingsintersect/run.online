"use client"

import { Clock, ClipboardList } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { useUpcomingAssessments } from "../../hooks/use-sync-assessments"

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date"
  const diffDays = Math.ceil(
    (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays <= 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  return `Due in ${diffDays} days`
}

export function UpcomingAssessmentsWidget() {
  const { data, isLoading } = useUpcomingAssessments()
  const items = data?.data ?? []

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Clock size={14} className="text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          Upcoming Moodle Deadlines
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No upcoming deadlines"
          description="You're all clear for now."
          className="py-8"
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.courseCode}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-primary">
                {formatDue(item.dueDate)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
