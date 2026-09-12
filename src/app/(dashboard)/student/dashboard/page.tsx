"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import {
  Award,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
} from "lucide-react"
import Link from "next/link"
import { useAppStore } from "@/store"
import { useStudentDashboardData } from "@/hooks/useStudentDashboard"
import { useMyStudent } from "@/hooks/use-my-student-id"
import { useNotifications } from "@/modules/notifications/hooks/use-notifications"

interface DashboardCardProps {
  title: string
  subtitle?: string
  icon: ReactNode
  children: ReactNode
  action?: ReactNode
}

function DashboardCard({
  title,
  subtitle,
  icon,
  action,
  children,
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm backdrop-blur-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-card-foreground">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      {children}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

function hasPermission(
  permissions: { resource: string; action: string }[] | undefined,
  resource: string,
  action: string
): boolean {
  if (!permissions?.length) return false
  return permissions.some(
    (entry) => entry.resource === resource && entry.action === action
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

const fmt = (n: number | null, suffix = "") =>
  n === null ? "…" : `${n}${suffix}`

export default function StudentDashboardPage() {
  const { user } = useAppStore()
  const permissionSet = user?.permissions
  const { data: notifData } = useNotifications({ limit: 6 })
  const recentNotifs = notifData?.data ?? []
  const d = useStudentDashboardData()
  const { student } = useMyStudent()

  const canViewNotifications = hasPermission(
    permissionSet,
    "notifications",
    "view.own"
  )
  const canViewTimetable = hasPermission(permissionSet, "timetable", "view.own")

  // Department / Faculty / Level come from the student's own record
  // (`GET /users/students/me`, already resolved once via useStudentDashboardData
  // → useMyStudentId, so this adds no request), not the auth session — which
  // never carries them, which is why these read "—" before.
  const dashboardProfile = {
    department: student?.department_name || "—",
    faculty: student?.faculty_name || "—",
    level: student?.current_level ? `${student.current_level} Level` : "—",
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  const firstName = user?.name.split(" ")[0] ?? "Student"
  const nextSession = d.todaysSessions[0]

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/15 via-background to-sky-500/10 p-6"
      >
        <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Student Overview Page
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your classes, courses, attendance, and results — all in one place.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatPill label="Department" value={dashboardProfile.department} />
          <StatPill label="Faculty" value={dashboardProfile.faculty} />
          <StatPill label="Level" value={dashboardProfile.level} />
        </div>
      </motion.div>

      {d.studentId === null && !d.isLoading && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
          Your student record couldn&apos;t be resolved yet, so course,
          attendance, and result data below can&apos;t load — check back once
          that&apos;s available.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Today's Sessions"
          subtitle="From your timetable"
          icon={<CalendarDays size={18} />}
        >
          <p className="text-3xl font-bold text-foreground">
            {fmt(d.isLoading ? null : d.todaysSessions.length)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {nextSession
              ? `Next: ${nextSession.courseCode} at ${nextSession.startTime}`
              : "Nothing scheduled today"}
          </p>
        </DashboardCard>

        <DashboardCard
          title="Enrolled Courses"
          subtitle="Active this semester"
          icon={<BookOpen size={18} />}
        >
          <p className="text-3xl font-bold text-foreground">
            {fmt(d.isLoading ? null : d.activeCourseCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fmt(d.isLoading ? null : d.totalUnits)} total credit units
          </p>
        </DashboardCard>

        <DashboardCard
          title="Attendance"
          subtitle="Across all courses"
          icon={<CalendarCheck size={18} />}
        >
          <p className="text-3xl font-bold text-foreground">
            {d.overallAttendance !== null ? `${d.overallAttendance}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Present + late ÷ total sessions
          </p>
        </DashboardCard>

        <DashboardCard
          title="CGPA"
          subtitle="Current standing"
          icon={<Award size={18} />}
        >
          <p className="text-3xl font-bold text-foreground">
            {d.currentCGPA !== null ? d.currentCGPA.toFixed(2) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Out of 5.0</p>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DashboardCard
          title="Today's Schedule"
          subtitle="Your classes for today"
          icon={<CalendarDays size={18} />}
          action={
            canViewTimetable ? (
              <Link
                href="/student/timetable"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View full timetable
              </Link>
            ) : undefined
          }
        >
          {!canViewTimetable ? (
            <p className="text-xs text-muted-foreground">
              Timetable permission is not enabled for your role.
            </p>
          ) : d.todaysSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No classes scheduled for today.
            </p>
          ) : (
            <div className="space-y-2">
              {d.todaysSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.courseCode} — {s.courseTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.venue}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-primary">
                    {s.startTime}–{s.endTime}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-border/60 pt-3">
            <Link
              href="/student/courses"
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 p-3 transition-colors hover:bg-accent/40"
            >
              <p className="text-sm font-medium text-foreground">
                Continue on Moodle
              </p>
              <BookOpen size={16} className="text-primary" />
            </Link>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Notifications"
          subtitle="Latest updates"
          icon={<Bell size={18} />}
          action={
            canViewNotifications ? (
              <Link
                href="/student/notifications"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all notifications
              </Link>
            ) : undefined
          }
        >
          {!canViewNotifications ? (
            <p className="text-xs text-muted-foreground">
              Notification access is disabled for your role.
            </p>
          ) : recentNotifs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentNotifs.map((n) => (
                <Link
                  key={n.id}
                  href="/student/notifications"
                  className={
                    "block rounded-2xl border border-border/70 p-3 transition-colors hover:bg-accent/40 " +
                    (n.readAt === null ? "bg-primary/5" : "bg-background/60")
                  }
                >
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {n.subject}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </div>
  )
}
