"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  Users,
  Award,
  AlertCircle,
  Search,
  X,
  CheckCircle2,
} from "lucide-react"
import { CourseAssignmentCard } from "./_components/CourseAssignmentCard"
import { useAssignedCourses } from "@/modules/tutor-courses/hooks/use-tutor-courses"

// ─── Summary pill ─────────────────────────────────────────────────────────────

function SummaryPill({
  label,
  value,
  colour,
}: {
  label: string
  value: string | number
  colour: string
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${colour}`}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-muted/60" />
          <div className="h-4 w-48 rounded bg-muted/60" />
          <div className="h-3 w-36 rounded bg-muted/60" />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="h-3 w-24 rounded bg-muted/40" />
        <div className="h-3 w-32 rounded bg-muted/40" />
      </div>
      <div className="h-3 w-40 rounded bg-muted/40" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseAssignmentPage() {
  const { courses, loading, error } = useAssignedCourses()
  const [search, setSearch] = useState("")

  const filtered = courses.filter(
    (c) =>
      !search ||
      c.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      c.courseCode.toLowerCase().includes(search.toLowerCase())
  )

  const totalStudents = courses.reduce(
    (a, c) => a + (c.registeredStudents ?? 0),
    0
  )
  const totalCredits = courses.reduce((a, c) => a + (c.creditUnits ?? 0), 0)
  const scheduledCount = courses.filter((c) => c.schedule.length > 0).length

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                My Assigned Courses
              </h2>
              <p className="text-xs text-muted-foreground">
                Courses assigned to you this semester · set your class schedule
                below
              </p>
            </div>
          </div>

          {/* Summary pills */}
          {!loading && courses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <SummaryPill
                label="Courses"
                value={courses.length}
                colour="border-border"
              />
              <SummaryPill
                label="Total Credits"
                value={totalCredits}
                colour="border-blue-200 dark:border-blue-900/50"
              />
              <SummaryPill
                label="Students"
                value={totalStudents}
                colour="border-violet-200 dark:border-violet-900/50"
              />
              <SummaryPill
                label="Scheduled"
                value={`${scheduledCount}/${courses.length}`}
                colour={
                  scheduledCount === courses.length
                    ? "border-emerald-200 dark:border-emerald-900/50"
                    : "border-amber-200 dark:border-amber-900/50"
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Unscheduled courses notice */}
      <AnimatePresence>
        {!loading && courses.length > 0 && scheduledCount < courses.length && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs dark:border-amber-800/40 dark:bg-amber-950/20"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-amber-700 dark:text-amber-400">
              <span className="font-semibold">
                {courses.length - scheduledCount} course
                {courses.length - scheduledCount !== 1 ? "s" : ""}
              </span>{" "}
              {courses.length - scheduledCount !== 1 ? "have" : "has"} no
              schedule set. Click <strong>Set Schedule</strong> on each card to
              add days, times, and venues.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All scheduled notice */}
      <AnimatePresence>
        {!loading &&
          courses.length > 0 &&
          scheduledCount === courses.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              All courses have a schedule set for this semester.
            </motion.div>
          )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      {!loading && courses.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search course code, title or program…"
            className="w-full rounded-xl border border-border bg-card py-2 pr-8 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Course cards grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course, i) => (
            <CourseAssignmentCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}

      {/* Empty search state */}
      {!loading && courses.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/60">
            <Search className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            No courses match
          </p>
          <p className="text-xs text-muted-foreground">
            Try a different course code or title.
          </p>
        </div>
      )}

      {/* Empty no-assignment state */}
      {!loading && !error && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            No courses assigned yet
          </p>
          <p className="max-w-72 text-xs text-muted-foreground">
            Course assignments will appear here at the start of each semester
            once the academic office processes allocations.
          </p>
        </div>
      )}

      {/* Footer summary */}
      {!loading && courses.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {courses.length} course{courses.length !== 1 ? "s" : ""} this
            semester
          </span>
          <span className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5" />
            {totalCredits} credit units total
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {totalStudents} students across all courses
          </span>
        </div>
      )}
    </div>
  )
}
