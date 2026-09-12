"use client"

import {
  Bell,
  Building2,
  ClipboardList,
  GraduationCap,
  Layers,
  Users,
  WifiSyncIcon,
} from "lucide-react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"
import { useOperationsDashboardData } from "@/hooks/useAdminDashboard"

const fmt = (n: number | null, suffix = "") =>
  n === null ? "…" : `${n.toLocaleString()}${suffix}`
const fmtNgn = (n: number | null) =>
  n === null ? "…" : `₦${(n / 1_000_000).toFixed(1)}M`

export default function AdminPage() {
  const d = useOperationsDashboardData()

  const focusItems = [
    {
      title: "Admission applications awaiting review",
      meta: "Registry queue",
      description: d.pendingApplicationCount
        ? `${d.pendingApplicationCount} application${d.pendingApplicationCount !== 1 ? "s" : ""} submitted and waiting on a decision.`
        : "No pending applications right now.",
      status:
        d.pendingApplicationCount && d.pendingApplicationCount > 0
          ? "Needs review"
          : "Clear",
      tone:
        d.pendingApplicationCount && d.pendingApplicationCount > 0
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Fee collection status",
      meta: "Finance office",
      description:
        d.totalOutstanding != null
          ? `${fmtNgn(d.totalOutstanding)} outstanding across current invoices.`
          : "Loading fee collection data…",
      status: d.collectionRate != null ? `${d.collectionRate}% collected` : "—",
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      title: "Moodle assessment sync",
      meta: "Moodle Sync module",
      description:
        d.unsyncedAssessments != null
          ? `${d.unsyncedAssessments} assessment${d.unsyncedAssessments !== 1 ? "s" : ""} pending or failed sync.`
          : "Loading sync status…",
      status: d.unsyncedAssessments === 0 ? "All synced" : "Attention needed",
      tone:
        d.unsyncedAssessments === 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ]

  return (
    <RoleDashboard
      eyebrow="Faculty Administration"
      title="Keep academic operations moving with confidence."
      subtitle="Track admissions, course allocation, department performance, and the approvals that need attention across the admin office."
      accent="from-amber-100 via-background to-orange-50 dark:from-amber-950/40 dark:via-background dark:to-orange-950/20"
      stats={[
        {
          title: "Active Students",
          value: fmt(d.totalStudents),
          detail: "Live count across the platform",
          icon: GraduationCap,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        {
          title: "Tutor Records",
          value: fmt(d.totalTutors),
          detail: "Live count across the platform",
          icon: Users,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          title: "Pending Applications",
          value: fmt(d.pendingApplicationCount),
          detail: "Awaiting admission review",
          icon: ClipboardList,
          tone: "bg-red-500/10 text-red-600 dark:text-red-400",
        },
        {
          title: "Departments",
          value: fmt(d.departmentCount),
          detail: "Registered across all faculties",
          icon: Building2,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
      ]}
      focusTitle="Operational Focus"
      focusItems={focusItems}
      quickActions={[
        {
          title: "Review student records",
          href: "/admin/users/students",
          description:
            "Audit enrolment, clearance, and department distribution.",
          icon: GraduationCap,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        {
          title: "Course structure",
          href: "/admin/academics/course-structure",
          description: "Manage faculties, departments, and programs.",
          icon: Layers,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          title: "Moodle sync status",
          href: "/admin/moodle-sync/assessments",
          description: "Check assessment sync health with Moodle.",
          icon: WifiSyncIcon,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
        {
          title: "Publish announcements",
          href: "/admin/announcements",
          description: "Send school-wide notices and faculty updates.",
          icon: Bell,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
      ]}
      signalsTitle="Admin Signals"
      signals={[
        {
          label: "Fee collection rate",
          value: d.collectionRate != null ? `${d.collectionRate}%` : "…",
        },
        { label: "Active platform users", value: fmt(d.activeUsers) },
        {
          label: "Assessment sync health",
          value:
            d.unsyncedAssessments != null
              ? d.unsyncedAssessments === 0
                ? "All synced"
                : `${d.unsyncedAssessments} pending`
              : "…",
        },
      ]}
    />
  )
}
