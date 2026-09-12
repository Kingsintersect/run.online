"use client"

import { Info, Award } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { useMyMoodleGrades } from "../../hooks/use-sync-grades"
import type { GradeResponse } from "../../types"

function groupByCourse(items: GradeResponse[]) {
  const groups = new Map<string, { title: string; items: GradeResponse[] }>()
  for (const item of items) {
    const code = item.course.courseOffering.course.code
    const group = groups.get(code) ?? {
      title: item.course.courseOffering.course.title,
      items: [],
    }
    group.items.push(item)
    groups.set(code, group)
  }
  return groups
}

export function MyGradesWidget() {
  const { data, isLoading } = useMyMoodleGrades()
  const items = data?.data ?? []
  const groups = groupByCourse(items)

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/4 px-4 py-3">
        <Info size={14} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          These are Moodle activity grades (assignments, quizzes, forums). Your
          official results are available under{" "}
          <span className="font-medium text-foreground">Results</span>.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-muted/40"
            />
          ))}
        </div>
      ) : groups.size === 0 ? (
        <EmptyState
          icon={Award}
          title="No Moodle grades yet"
          description="Grades will appear here once your instructors grade activities on Moodle."
        />
      ) : (
        Array.from(groups.entries()).map(([code, group]) => (
          <div
            key={code}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="border-b border-border bg-muted/20 px-4 py-2.5">
              <p className="text-sm font-semibold text-foreground">{code}</p>
              <p className="text-xs text-muted-foreground">{group.title}</p>
            </div>
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-none"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {item.itemName}
                  </p>
                  {item.feedback && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.feedback}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                  {item.grade ?? "—"}
                  {item.maxGrade !== null ? ` / ${item.maxGrade}` : ""}
                </span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
