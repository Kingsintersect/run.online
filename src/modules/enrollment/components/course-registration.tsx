"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Table2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import StatusBadge from "@/components/custom/StatusBadge"
import EmptyState from "@/components/custom/EmptyState"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { courseOfferingQueryOptions } from "@/services/courseOfferingApi"
import { formatOfferingMeta } from "@/lib/academic/course-offering-enrichment"
import { useEnrollmentsByStudent } from "../hooks/use-enrollments"
import { useSelfEnrollMany } from "../hooks/use-enrollment-mutations"
import { DropEnrollmentDialog } from "./drop-enrollment-dialog"
import type { EnrollmentRecord, EnrollmentStatus } from "../types"
import type { CourseOffering } from "@/types/school"

type ViewMode = "card" | "table"
type StatusVariant = "success" | "warning" | "default"

const STATUS_BADGE: Record<
  EnrollmentStatus,
  { label: string; variant: StatusVariant }
> = {
  ENROLLED: { label: "Enrolled", variant: "success" },
  DROPPED: { label: "Dropped", variant: "default" },
  WITHDRAWN: { label: "Withdrawn", variant: "warning" },
}

function capacityLabel(o: CourseOffering): string {
  if (o.max_capacity == null) return `${o.enrolled_count ?? 0} enrolled`
  return `${o.enrolled_count ?? 0} / ${o.max_capacity}`
}

export function CourseRegistration() {
  const {
    studentId,
    isLoading: resolvingStudentId,
    isError: studentIdErrored,
    refetch: retryStudentId,
  } = useMyStudentId()

  const offeringsQuery = useQuery(courseOfferingQueryOptions.list())
  const {
    data: enrollmentData,
    isLoading: loadingEnrollments,
    isError: enrollmentsErrored,
  } = useEnrollmentsByStudent(studentId)
  const enrollMany = useSelfEnrollMany()

  const [view, setView] = useState<ViewMode>("card")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [dropping, setDropping] = useState<EnrollmentRecord | null>(null)

  const enrollments = useMemo(() => enrollmentData ?? [], [enrollmentData])
  const active = enrollments.filter((e) => e.status === "ENROLLED")
  const totalUnits = active.reduce((a, e) => a + e.creditUnits, 0)

  const activeOfferingIds = useMemo(
    () => new Set(active.map((e) => e.offeringId)),
    [active]
  )

  const available = useMemo(
    () =>
      (offeringsQuery.data?.data ?? []).filter(
        (o) => o.status === "OPEN" && !activeOfferingIds.has(o.id)
      ),
    [offeringsQuery.data, activeOfferingIds]
  )

  const allSelected = available.length > 0 && selected.size === available.length
  const someSelected = selected.size > 0 && !allSelected

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === available.length
        ? new Set()
        : new Set(available.map((o) => o.id))
    )

  const handleEnroll = async () => {
    if (studentId === null || selected.size === 0) return
    const picked = available.filter((o) => selected.has(o.id))
    try {
      const result = await enrollMany.mutateAsync({
        studentId,
        items: picked.map((o) => ({
          offeringId: o.id,
          semesterId: o.semester_id,
        })),
      })
      if (result.enrolled.length) {
        toast.success(
          `Enrolled in ${result.enrolled.length} course${
            result.enrolled.length !== 1 ? "s" : ""
          }.`
        )
      }
      for (const err of result.errors) {
        const offering = picked.find((o) => o.id === err.offeringId)
        toast.error(`${offering?.course_code ?? "Course"}: ${err.message}`)
      }
      setSelected((prev) => {
        const next = new Set(prev)
        for (const r of result.enrolled) next.delete(r.offeringId)
        return next
      })
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Enrollment failed.")
    }
  }

  if (studentId === null && !resolvingStudentId) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={
          studentIdErrored
            ? "Couldn't resolve your student record"
            : "Your student record couldn't be resolved"
        }
        description={
          studentIdErrored
            ? "This is usually a passing hiccup — try again."
            : "This page needs the backend to support resolving your own student profile — check back once that's available."
        }
        action={
          studentIdErrored ? (
            <Button size="sm" onClick={() => retryStudentId()}>
              Try again
            </Button>
          ) : undefined
        }
      />
    )
  }

  const loadingAvailable = offeringsQuery.isLoading || resolvingStudentId

  return (
    <div className="space-y-8">
      {/* ── Available offerings ─────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {available.length} open offering
                {available.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Select the courses you want and enroll
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => setView("card")}
                aria-pressed={view === "card"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "card"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                aria-pressed={view === "table"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  view === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/student/courses">
                My Courses
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {offeringsQuery.isError && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            Couldn&apos;t load the course offerings.{" "}
            <button
              onClick={() => void offeringsQuery.refetch()}
              className="font-semibold underline"
            >
              Try again
            </button>
          </p>
        )}

        {loadingAvailable ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : available.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No open offerings to register"
            description="There are no open course offerings you aren't already enrolled in. Check back when registration opens."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all offerings"
                />
                Select all ({available.length})
              </label>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={selected.size === 0 || enrollMany.isPending}
                onClick={() => void handleEnroll()}
              >
                {enrollMany.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Enroll selected ({selected.size})
              </Button>
            </div>

            {view === "card" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {available.map((o, i) => {
                  const checked = selected.has(o.id)
                  return (
                    <motion.label
                      key={o.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-2xl border bg-card p-4 transition-colors",
                        checked
                          ? "border-primary ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(o.id)}
                        className="mt-0.5"
                        aria-label={`Select ${o.course_code}`}
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-primary">
                              {o.course_code}
                            </p>
                            <h3 className="truncate text-sm font-bold text-foreground">
                              {o.course_title}
                            </h3>
                          </div>
                          <StatusBadge label="Open" variant="success" dot />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatOfferingMeta(o) || "Details pending"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Capacity: {capacityLabel(o)}
                        </p>
                      </div>
                    </motion.label>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2.5">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleAll}
                          aria-label="Select all offerings"
                        />
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Code</th>
                      <th className="px-3 py-2.5 font-semibold">Title</th>
                      <th className="px-3 py-2.5 font-semibold">Details</th>
                      <th className="px-3 py-2.5 font-semibold">Capacity</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {available.map((o) => {
                      const checked = selected.has(o.id)
                      return (
                        <tr
                          key={o.id}
                          onClick={() => toggle(o.id)}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/30",
                            checked && "bg-primary/5"
                          )}
                        >
                          <td
                            className="px-3 py-2.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggle(o.id)}
                              aria-label={`Select ${o.course_code}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                            {o.course_code}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-foreground">
                            {o.course_title}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {formatOfferingMeta(o) || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {capacityLabel(o)}
                          </td>
                          <td className="px-3 py-2.5">
                            <StatusBadge label="Open" variant="success" dot />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Enrolled courses ────────────────────────────────── */}
      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {active.length} registered course{active.length !== 1 ? "s" : ""}{" "}
              · {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Your enrolled courses this semester
            </p>
          </div>
        </div>

        {enrollmentsErrored && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            Couldn&apos;t load your enrollment records.
          </p>
        )}

        {loadingEnrollments || resolvingStudentId ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses registered yet"
            description="Select open offerings above and enroll to see them here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {enrollments.map((e) => (
              <div
                key={e.id}
                className="space-y-2 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-primary">
                      {e.courseCode}
                    </p>
                    <h3 className="truncate text-sm leading-snug font-bold text-foreground">
                      {e.courseTitle}
                    </h3>
                  </div>
                  <StatusBadge {...STATUS_BADGE[e.status]} dot />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {e.creditUnits} unit{e.creditUnits !== 1 ? "s" : ""}
                  </span>
                  {e.lecturerName && <span>· {e.lecturerName}</span>}
                </div>
                {e.status === "ENROLLED" && (
                  <div className="flex justify-end border-t border-border/50 pt-1">
                    <button
                      onClick={() => setDropping(e)}
                      className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Drop
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <DropEnrollmentDialog
        enrollment={dropping}
        onClose={() => setDropping(null)}
      />
    </div>
  )
}
