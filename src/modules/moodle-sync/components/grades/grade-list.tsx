"use client"

import { toast } from "sonner"
import { Award } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { useSyncGrades } from "../../hooks/use-sync-grades"
import { usePullAllGrades } from "../../hooks/use-sync-mutations"
import { PushPullToolbar } from "../shared/push-pull-toolbar"

export function GradeList() {
  const { data, isLoading, isError } = useSyncGrades()
  const pullAll = usePullAllGrades()

  const handlePullAll = async () => {
    try {
      const result = await pullAll.mutateAsync()
      toast.success(`Pulled ${result.pulled} grade item(s) from Moodle`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed")
    }
  }

  const items = data?.data ?? []

  return (
    <div className="space-y-3">
      <PushPullToolbar
        title="Moodle Gradebook Items"
        subtitle="Read-only — pulled from Moodle's gradebook. Separate from official portal Results."
        onPull={handlePullAll}
        pullLabel="Pull All"
        pullPending={pullAll.isPending}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load grades"
          description="Please try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No grade items"
          description="Nothing has been pulled from Moodle yet."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-none"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {item.itemName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.course.courseOffering.course.code}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                {item.grade ?? "—"}
                {item.maxGrade !== null ? ` / ${item.maxGrade}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
