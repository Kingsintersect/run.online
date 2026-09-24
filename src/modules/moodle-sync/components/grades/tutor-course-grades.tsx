"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Award, BookOpen, Info } from "lucide-react"
import EmptyState from "@/components/custom/EmptyState"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { useMyLecturerId } from "@/hooks/use-my-lecturer-id"
import { useSyncGradesByCourse } from "../../hooks/use-sync-grades"
import type { CourseOffering } from "@/types/school"
import type { GradeResponse } from "../../types"

function fullName(user: {
  firstName?: string | null
  lastName?: string | null
}) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || null
}

// Groups the flat item list by student when the response identifies one
// (see grade.schema.ts's note — not confirmed live for this endpoint yet).
// Falls back to a single ungrouped block, clearly labeled, rather than
// silently mis-grouping everything under one row.
function groupByStudent(items: GradeResponse[]) {
  const groups = new Map<
    string,
    { label: string; matric: string | null; items: GradeResponse[] }
  >()
  let anyIdentified = false
  for (const item of items) {
    const matric = item.student?.matricNumber ?? null
    const name = item.student?.user ? fullName(item.student.user) : null
    const key =
      item.studentId != null
        ? String(item.studentId)
        : (matric ?? name ?? "unknown")
    if (item.studentId != null || matric || name) anyIdentified = true
    const group = groups.get(key) ?? {
      label: name ?? matric ?? "Unidentified student",
      matric,
      items: [],
    }
    group.items.push(item)
    groups.set(key, group)
  }
  return { groups: Array.from(groups.values()), anyIdentified }
}

// Tutor-scoped, read-only view of the raw Moodle gradebook items for one of
// the tutor's own course offerings (GET /moodle-sync/grades/course/:id —
// "Admin, Lecturer" per its bruno doc). Distinct from the official portal
// Grade Book (TutorCourseGradeBook): this is whatever Moodle's own gradebook
// has recorded for each activity, not the computed course result.
//
// Also the CLAUDE.md §14 fallback inside the Results workspace while
// `GET /results/offerings` isn't live: a lecturer (TUTOR, or a HOD/DEAN who
// teaches) sees their own offerings; a non-lecturer (e.g. ADMIN) sees every
// offering. Raw Moodle marks only, never adjusted or computed scores.
export function TutorCourseMoodleGrades() {
  const [selectedOffering, setSelectedOffering] =
    useState<CourseOffering | null>(null)

  const { lecturerId, isLoading: lecturerIdLoading } = useMyLecturerId()
  const { data: offeringsRes, isLoading: offeringsQueryLoading } = useQuery({
    ...courseOfferingQueryOptions.list(
      lecturerId != null ? { lecturerId } : undefined
    ),
    enabled: !lecturerIdLoading,
  })
  const offeringsLoading = lecturerIdLoading || offeringsQueryLoading
  const offerings = offeringsRes?.data ?? []

  const { data, isLoading, isError } = useSyncGradesByCourse(
    selectedOffering?.id ?? 0
  )
  const items = useMemo(() => data?.data ?? [], [data])
  const { groups, anyIdentified } = useMemo(
    () => groupByStudent(items),
    [items]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Live Moodle marks
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Read-only, straight from each course&apos;s Moodle gradebook. Grade
            in Moodle, putting every activity in the CA or EXAM category.
          </p>
        </div>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-8 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
            value={selectedOffering?.id ?? ""}
            disabled={offeringsLoading}
            onChange={(e) =>
              setSelectedOffering(
                offerings.find((o) => o.id === Number(e.target.value)) ?? null
              )
            }
          >
            <option value="">
              {offeringsLoading
                ? "Loading courses…"
                : "Select a course offering…"}
            </option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.course_code} — {o.course_title}
                {" · "}
                {[
                  o.semester_name ?? `Semester #${o.semester_id}`,
                  o.session_name,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {!selectedOffering ? (
        <EmptyState
          icon={BookOpen}
          title="No course selected"
          description="Choose a course offering above to load its Moodle grades."
        />
      ) : isLoading ? (
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
          title="Couldn't load Moodle grades"
          description="Please try again."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No grade items"
          description="Nothing has been pulled from Moodle for this course yet."
        />
      ) : (
        <>
          {!anyIdentified && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-xs text-muted-foreground">
                The API didn&apos;t return which student each item below belongs
                to — showing every graded item for this course unsorted until
                that&apos;s available.
              </p>
            </div>
          )}
          {groups.map((group, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              {anyIdentified && (
                <div className="border-b border-border bg-muted/20 px-4 py-2.5">
                  <p className="text-sm font-semibold text-foreground">
                    {group.label}
                  </p>
                  {group.matric && (
                    <p className="text-xs text-muted-foreground">
                      {group.matric}
                    </p>
                  )}
                </div>
              )}
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
          ))}
        </>
      )}
    </div>
  )
}
