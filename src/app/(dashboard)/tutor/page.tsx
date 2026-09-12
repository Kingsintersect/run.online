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

const fmt = (n: number | null) => (n === null ? "…" : n.toLocaleString())

export default function TutorPage() {
  const d = useTutorDashboardData()
  const nextSession = d.todaysSessions[0]

  const focusItems =
    d.todaysSessions.length > 0
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
            value: fmt(d.assignedCourseCount),
            detail: "Course offerings this semester",
            icon: BookOpen,
            tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          },
          {
            title: "Today's Sessions",
            value: fmt(d.todaysSessions.length),
            detail: nextSession
              ? `Next: ${nextSession.startTime} · ${nextSession.venue}`
              : "Nothing scheduled",
            icon: CalendarDays,
            tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          },
          {
            title: "Unread Notifications",
            value: fmt(d.unreadNotifications),
            detail: "From students and the registry",
            icon: MessageSquare,
            tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
        ]}
        focusTitle="Teaching Agenda"
        focusItems={focusItems}
        quickActions={[
          {
            title: "Submit results",
            href: "/tutor/grading/submit",
            description:
              "Push approved scores into the semester result workflow.",
            icon: FileText,
            tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
          },
          {
            title: "Open grade book",
            href: "/tutor/grading/book",
            description: "Review scripts, moderation notes, and grade trends.",
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
          { label: "Assigned courses", value: fmt(d.assignedCourseCount) },
          { label: "Sessions today", value: fmt(d.todaysSessions.length) },
          { label: "Unread notifications", value: fmt(d.unreadNotifications) },
        ]}
      />
    </div>
  )
}
