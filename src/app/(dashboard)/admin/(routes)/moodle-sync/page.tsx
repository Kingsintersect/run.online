"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  WifiSyncIcon,
  Building2,
  Users,
  BookOpen,
  Link2,
  ClipboardList,
  Award,
  CalendarDays,
  UsersRound,
  ArrowRight,
} from "lucide-react"
import { AlertTriangle, type LucideIcon } from "lucide-react"
import { useSyncCategories } from "@/modules/moodle-sync/hooks/use-sync-categories"
import { useSyncUsers } from "@/modules/moodle-sync/hooks/use-sync-users"
import { useSyncCourses } from "@/modules/moodle-sync/hooks/use-sync-courses"
import { useSyncEnrollments } from "@/modules/moodle-sync/hooks/use-sync-enrollments"
import { useSyncAssessments } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { useSyncGrades } from "@/modules/moodle-sync/hooks/use-sync-grades"
import { useSyncCalendarEvents } from "@/modules/moodle-sync/hooks/use-sync-calendar"
import { useSyncCohorts } from "@/modules/moodle-sync/hooks/use-sync-cohorts"
import { describeSyncError } from "@/modules/moodle-sync/lib/sync-error"

interface SummaryCardProps {
  href: string
  icon: LucideIcon
  title: string
  description: string
  total: number
  healthy: number
  isLoading: boolean
  /** The count couldn't be loaded: show "—", never a misleading 0. */
  isError: boolean
}

function SummaryCard({
  href,
  icon: Icon,
  title,
  description,
  total,
  healthy,
  isLoading,
  isError,
}: SummaryCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-primary/4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon size={18} className="text-primary" />
        </div>
        <ArrowRight
          size={14}
          className="mt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="mt-3 flex items-baseline gap-1.5">
        {isLoading ? (
          <span className="h-6 w-10 animate-pulse rounded bg-muted" />
        ) : isError ? (
          <>
            <span className="text-xl font-bold text-muted-foreground">—</span>
            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <AlertTriangle size={12} aria-hidden />
              Couldn&apos;t load
            </span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold text-foreground tabular-nums">
              {total}
            </span>
            <span className="text-xs text-muted-foreground">total</span>
            {total > 0 && (
              <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                {healthy} synced
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

export default function MoodleSyncOverviewPage() {
  const categories = useSyncCategories()
  const users = useSyncUsers()
  const courses = useSyncCourses()
  const enrollments = useSyncEnrollments()
  const assessments = useSyncAssessments()
  const grades = useSyncGrades()
  const calendar = useSyncCalendarEvents()
  const cohorts = useSyncCohorts()

  const queries = [
    categories,
    users,
    courses,
    enrollments,
    assessments,
    grades,
    calendar,
    cohorts,
  ]
  const failed = queries.filter((q) => q.isError)
  const failure = failed.length ? describeSyncError(failed[0].error) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10">
          <WifiSyncIcon className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Moodle Sync
          </h1>
          <p className="text-sm text-muted-foreground">
            Bidirectional sync between the portal and the Moodle LMS —
            categories, users, courses, enrollments, and read-only assessments,
            grades, and calendar/Zoom events.
          </p>
        </div>
      </motion.div>

      {failure && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10"
        >
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {failed.length === queries.length
                ? "Moodle sync information couldn't be loaded"
                : `${failed.length} of ${queries.length} sections couldn't be loaded`}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {failure.description}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          href="/admin/moodle-sync/categories"
          icon={Building2}
          title="Categories"
          description="Faculty → Program → Level → Semester"
          total={categories.data?.length ?? 0}
          healthy={
            categories.data?.filter((c) => c.syncStatus === "SYNCED").length ??
            0
          }
          isLoading={categories.isLoading}
          isError={categories.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/users"
          icon={Users}
          title="Users"
          description="Students, lecturers, staff"
          total={users.data?.length ?? 0}
          healthy={
            users.data?.filter((u) => u.syncStatus === "SYNCED").length ?? 0
          }
          isLoading={users.isLoading}
          isError={users.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/courses"
          icon={BookOpen}
          title="Courses"
          description="Course offerings ↔ Moodle courses"
          total={courses.data?.length ?? 0}
          healthy={
            courses.data?.filter((c) => c.syncStatus === "SYNCED").length ?? 0
          }
          isLoading={courses.isLoading}
          isError={courses.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/enrollments"
          icon={Link2}
          title="Enrollments"
          description="Student ↔ course enrollment sync"
          total={enrollments.data?.length ?? 0}
          healthy={
            enrollments.data?.filter((e) => e.syncStatus === "SYNCED").length ??
            0
          }
          isLoading={enrollments.isLoading}
          isError={enrollments.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/assessments"
          icon={ClipboardList}
          title="Assessments"
          description="Read-only — assignments, quizzes, forums"
          total={assessments.data?.data.length ?? 0}
          healthy={assessments.data?.data.length ?? 0}
          isLoading={assessments.isLoading}
          isError={assessments.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/grades"
          icon={Award}
          title="Grades"
          description="Read-only — Moodle gradebook items"
          total={grades.data?.data.length ?? 0}
          healthy={grades.data?.data.length ?? 0}
          isLoading={grades.isLoading}
          isError={grades.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/calendar"
          icon={CalendarDays}
          title="Calendar & Zoom"
          description="Read-only — events and meeting links"
          total={calendar.data?.data.length ?? 0}
          healthy={calendar.data?.data.length ?? 0}
          isLoading={calendar.isLoading}
          isError={calendar.isError}
        />
        <SummaryCard
          href="/admin/moodle-sync/cohorts"
          icon={UsersRound}
          title="Cohorts"
          description="Program intakes, auto-enrolled into shared courses"
          total={cohorts.data?.length ?? 0}
          healthy={
            cohorts.data?.filter((c) => c.syncStatus === "SYNCED").length ?? 0
          }
          isLoading={cohorts.isLoading}
          isError={cohorts.isError}
        />
      </div>
    </div>
  )
}
