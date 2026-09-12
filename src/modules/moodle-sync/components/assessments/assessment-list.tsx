"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import EmptyState from "@/components/custom/EmptyState"
import { useSyncAssessments } from "../../hooks/use-sync-assessments"
import { usePullAllAssessments } from "../../hooks/use-sync-mutations"
import { PushPullToolbar } from "../shared/push-pull-toolbar"
import type { AssessmentType } from "../../types"

const TYPES: { value: AssessmentType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "assignment", label: "Assignments" },
  { value: "quiz", label: "Quizzes" },
  { value: "forum", label: "Forums" },
]

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date"
  return new Date(dueDate).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AssessmentList() {
  const [type, setType] = useState<AssessmentType | "all">("all")
  const { data, isLoading, isError } = useSyncAssessments(
    type === "all" ? undefined : { type }
  )
  const pullAll = usePullAllAssessments()

  const handlePullAll = async () => {
    try {
      const result = await pullAll.mutateAsync()
      // /assessments/sync-all queues a background job — { jobId, message }
      toast.success(
        result.message ??
          "Assessment sync queued — check back after the next run."
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed")
    }
  }

  const items = data?.data ?? []

  return (
    <div className="space-y-3">
      <PushPullToolbar
        title="Assessments"
        subtitle="Read-only — pulled from Moodle assignments, quizzes, and forums."
        onPull={handlePullAll}
        pullLabel="Pull All"
        pullPending={pullAll.isPending}
      />

      <div className="flex gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              type === t.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load assessments"
          description="Please try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments"
          description="Nothing has been pulled from Moodle yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-3.5 last:border-none"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                    {item.assessmentType}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.courseCode}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {item.name}
                </p>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {formatDue(item.dueDate)}
                </p>
                {item.maxGrade !== null && (
                  <p className="text-xs font-medium text-foreground">
                    {item.maxGrade} pts
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
