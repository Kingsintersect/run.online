"use client"

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Layers,
  MessageSquare,
} from "lucide-react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"
import { useTutorDashboardData } from "@/hooks/useTutorDashboard"
import { TutorOnboardingChecklist } from "@/modules/user-management/components/TutorOnboardingChecklist"
import { useAssignedCourses } from "@/modules/tutor-courses/hooks/use-tutor-courses"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useUnreadCount } from "@/modules/notifications/hooks/use-notifications"

export default function TutorPage() {
  const d = useTutorDashboardData()
  const nextSession = d.todaysSessions[0]
  // useTutorDashboardData doesn't expose per-source errors, so observe the
  // same cached queries (same keys, no extra requests). A refused (403) or
  // failed source shows "—", never "0" / "No classes scheduled today".
  const coursesFailed = useAssignedCourses().error != null
  const timetableFailed = useMyTimetable().isError
  const unreadFailed = useUnreadCount().isError
  const fmt = (n: number | null, failed = false) =>
    failed ? "—" : n === null ? (d.isLoading ? "…" : "—") : n.toLocaleString()

  const focusItems = timetableFailed
    ? [
        {
          title: "Today's timetable couldn't be loaded",
          meta: "Timetable",
          description:
            "Your sessions for today can't be shown right now — open the timetable to try again.",
          status: "—",
          tone: "bg-muted text-muted-foreground",
        },
      ]
    : d.todaysSessions.length > 0
      ? d.todaysSessions.slice(0, 3).map((s) => ({
          title: `${s.courseCode} — ${s.classType.charAt(0)}${s.classType.slice(1).toLowerCase()}`,
          meta: `${s.venue} · ${s.startTime}–${s.endTime}`,
          description: s.courseTitle,
          status: s === nextSession ? "Next up" : "Today",
          tone:
            s === nextSession
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        }))
      : [
          {
            title: "No classes scheduled today",
            meta: "Timetable",
            description: "You have no sessions on today's timetable.",
            status: "Clear",
            tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
        ]

  return (
    <div className="space-y-6">
      <TutorOnboardingChecklist />
      <RoleDashboard
        eyebrow="Teaching Workspace"
        title="Run classes, grading, and student support from one calm workspace."
        subtitle="See what needs attention today across lectures, assessment workflows, course materials, and student communication."
        accent="from-violet-100 via-background to-sky-50 dark:from-violet-950/35 dark:via-background dark:to-sky-950/20"
        stats={[
          {
            title: "Assigned Courses",
            value: fmt(d.assignedCourseCount, coursesFailed),
            detail: coursesFailed
              ? "Your courses couldn't be loaded"
              : "Course offerings this semester",
            icon: BookOpen,
            tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          },
          {
            title: "Today's Sessions",
            value: fmt(d.todaysSessions.length, timetableFailed),
            detail: timetableFailed
              ? "Your timetable couldn't be loaded"
              : nextSession
                ? `Next: ${nextSession.startTime} · ${nextSession.venue}`
                : "Nothing scheduled",
            icon: CalendarDays,
            tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          },
          {
            title: "Unread Notifications",
            value: fmt(d.unreadNotifications, unreadFailed),
            detail: "From students and the registry",
            icon: MessageSquare,
            tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
        ]}
        focusTitle="Teaching Agenda"
        focusItems={focusItems}
        quickActions={[
          // Grading happens in Moodle only (2026-09-24). "Open in Moodle"
          // lives on each course card in My Courses.
          {
            title: "Grade in Moodle",
            href: "/tutor/courses",
            description:
              "Open a course in Moodle and grade in its CA and EXAM categories.",
            icon: FileText,
            tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          },
          {
            title: "Course results",
            href: "/tutor/results",
            description: "See the marks pulled from Moodle for your courses.",
            icon: ClipboardList,
            tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          {
            title: "Take attendance",
            href: "/tutor/attendance",
            description: "Mark attendance for today's class sessions.",
            icon: Layers,
            tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          },
        ]}
        signalsTitle="Teaching Snapshot"
        signals={[
          {
            label: "Assigned courses",
            value: fmt(d.assignedCourseCount, coursesFailed),
          },
          {
            label: "Sessions today",
            value: fmt(d.todaysSessions.length, timetableFailed),
          },
          {
            label: "Unread notifications",
            value: fmt(d.unreadNotifications, unreadFailed),
          },
        ]}
      />
    </div>
  )
}
