"use client"

import {
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
  ShieldCheck,
  UserCog,
  Users,
  WifiSyncIcon,
} from "lucide-react"
import RoleDashboard from "@/components/dashboard/RoleDashboard"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import {
  usePlatformDashboardData,
  useStaffDashboardData,
} from "@/hooks/useManagerDashboard"

// null is "…" only while the dashboard is still loading; once loading is
// done a null figure was refused (403), failed, or isn't fetched for this
// role, so it shows "—" rather than spinning forever or reading as zero.
const fmtBase = (n: number | null, loading: boolean) =>
  n === null ? (loading ? "…" : "—") : n.toLocaleString()
const fmtNgn = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`

export default function ManagePage() {
  const { user } = useAppStore()

  // STAFF shares this route (manager/layout.tsx's RoleGuard allows
  // [ADMIN, DEAN, STAFF]) but has a materially smaller permission set than
  // ADMIN/DEAN — see useStaffDashboardData's header comment. Branch here
  // rather than making one dashboard component quietly work for both;
  // ADMIN/DEAN keep the existing platform-wide view below.
  if (user?.role === UserRole.STAFF) {
    return <StaffDashboard />
  }

  // DEAN also shares this route and, on the live backend, holds the same
  // dashboard-relevant permissions as ADMIN (CLAUDE.md §5) — so there is no
  // permission to branch on. A plain role check is the honest fallback, as
  // with STAFF above: a Dean oversees faculties, not the platform, and the
  // admin-only parts (role policies, pending admissions, Moodle sync — all
  // 403 or never fetched for DEAN, see useOperationsDashboardData) don't apply.
  if (user?.role === UserRole.DEAN) {
    return <DeanDashboard />
  }

  return <AdminManagerDashboard />
}

function StaffDashboard() {
  const d = useStaffDashboardData()
  const fmt = (n: number | null) => fmtBase(n, d.isLoading)

  return (
    <RoleDashboard
      eyebrow="Staff Operations"
      title="Keep student records and clearance moving."
      subtitle="Track enrolled students, clearance requests awaiting your approval, and the latest campus announcements."
      accent="from-blue-100 via-background to-cyan-50 dark:from-blue-950/35 dark:via-background dark:to-cyan-950/20"
      stats={[
        {
          title: "Enrolled Students",
          value: fmt(d.totalStudents),
          detail: "Total active student records",
          icon: GraduationCap,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Pending Clearance",
          value: fmt(d.pendingClearanceCount),
          detail: "Requests awaiting your approval",
          icon: ClipboardCheck,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        {
          title: "Recent Announcements",
          value: fmt(d.recentAnnouncements.length || null),
          detail: "Published in the last few updates",
          icon: Bell,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
      ]}
      focusTitle="Latest Announcements"
      focusItems={
        d.recentAnnouncements.length > 0
          ? d.recentAnnouncements.map((a) => ({
              title: a.title,
              meta: a.category,
              description: a.content,
              status: a.priority,
              tone:
                a.priority === "high" || a.priority === "urgent"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            }))
          : [
              {
                title: "No announcements yet",
                meta: "Communications",
                description: "Nothing published for the campus right now.",
                status: "Clear",
                tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              },
            ]
      }
      quickActions={[
        {
          title: "Manage students",
          href: "/manager/users/students",
          description: "View and update student records.",
          icon: UserCog,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Review clearance queue",
          href: "/manager/clearance",
          description: "Approve or reject pending clearance requests.",
          icon: ListChecks,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        {
          title: "Post an announcement",
          href: "/manager/announcements",
          description: "Share an update with students and staff.",
          icon: Bell,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
      ]}
      signalsTitle="Today at a Glance"
      signals={[
        { label: "Enrolled students", value: fmt(d.totalStudents) },
        { label: "Pending clearance", value: fmt(d.pendingClearanceCount) },
        {
          label: "Announcements live",
          value: fmt(d.recentAnnouncements.length || null),
        },
      ]}
    />
  )
}

function DeanDashboard() {
  const d = usePlatformDashboardData()
  const fmt = (n: number | null) => fmtBase(n, d.isLoading)

  return (
    <RoleDashboard
      eyebrow="Faculty Oversight"
      title="Keep your faculties on track."
      subtitle="Follow student numbers, departments and fee collection across the faculties you oversee, and step into course results when they need you."
      accent="from-indigo-100 via-background to-cyan-50 dark:from-indigo-950/35 dark:via-background dark:to-cyan-950/20"
      stats={[
        {
          title: "Students",
          value: fmt(d.totalStudents),
          detail: "Student records on file",
          icon: GraduationCap,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Tutors",
          value: fmt(d.totalTutors),
          detail: "Teaching staff on record",
          icon: Users,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          title: "Faculties",
          value: fmt(d.facultyCount),
          detail: "Registered academic faculties",
          icon: Building2,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
        {
          title: "Departments",
          value: fmt(d.departmentCount),
          detail: "Registered across all faculties",
          icon: Building2,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
      ]}
      focusTitle="Faculty Oversight"
      focusItems={[
        {
          title: "Fee collection status",
          meta: "Finance office",
          description:
            d.totalOutstanding != null
              ? `${fmtNgn(d.totalOutstanding)} outstanding across current invoices.`
              : d.isLoading
                ? "Loading fee collection data…"
                : "Fee collection figures couldn't be loaded for your account.",
          status:
            d.collectionRate != null ? `${d.collectionRate}% collected` : "—",
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
      ]}
      quickActions={[
        {
          title: "Students",
          href: "/manager/users/students",
          description: "Look up student records.",
          icon: UserCog,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Course results",
          href: "/tutor/results",
          description: "Review result sheets in your scope.",
          icon: ClipboardCheck,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
        {
          title: "Review analytics",
          href: "/manager/grades/summary",
          description: "Inspect academic performance trends.",
          icon: BarChart3,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
      ]}
      signalsTitle="Faculty Signals"
      signals={[
        {
          label: "Fee collection rate",
          value:
            d.collectionRate != null
              ? `${d.collectionRate}%`
              : d.isLoading
                ? "…"
                : "—",
        },
        { label: "Students", value: fmt(d.totalStudents) },
        { label: "Departments", value: fmt(d.departmentCount) },
      ]}
    />
  )
}

function AdminManagerDashboard() {
  const d = usePlatformDashboardData()
  const fmt = (n: number | null) => fmtBase(n, d.isLoading)

  const focusItems = [
    {
      title: "Admission applications awaiting review",
      meta: "Registry queue",
      // null = still loading, or refused/failed — only a real 0 is "Clear".
      description:
        d.pendingApplicationCount == null
          ? d.isLoading
            ? "Loading applications…"
            : "Pending applications couldn't be loaded."
          : d.pendingApplicationCount > 0
            ? `${d.pendingApplicationCount} application${d.pendingApplicationCount !== 1 ? "s" : ""} submitted and waiting on a decision.`
            : "No pending applications right now.",
      status:
        d.pendingApplicationCount == null
          ? "—"
          : d.pendingApplicationCount > 0
            ? "Needs review"
            : "Clear",
      tone:
        d.pendingApplicationCount == null
          ? "bg-muted text-muted-foreground"
          : d.pendingApplicationCount > 0
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Fee collection status",
      meta: "Finance office",
      description:
        d.totalOutstanding != null
          ? `${fmtNgn(d.totalOutstanding)} outstanding across current invoices.`
          : d.isLoading
            ? "Loading fee collection data…"
            : "Fee collection figures couldn't be loaded.",
      status: d.collectionRate != null ? `${d.collectionRate}% collected` : "—",
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      title: "Moodle assessment sync",
      meta: "Moodle Sync module",
      description:
        d.unsyncedAssessments != null
          ? `${d.unsyncedAssessments} assessment${d.unsyncedAssessments !== 1 ? "s" : ""} pending or failed sync.`
          : d.isLoading
            ? "Loading sync status…"
            : "Sync status couldn't be loaded.",
      status:
        d.unsyncedAssessments == null
          ? "—"
          : d.unsyncedAssessments === 0
            ? "All synced"
            : "Attention needed",
      tone:
        d.unsyncedAssessments === 0
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ]

  return (
    <RoleDashboard
      eyebrow="Platform Control"
      title="Monitor the entire portal like a control room."
      subtitle="Oversee governance, platform health, user access, and cross-campus configuration from one executive dashboard."
      accent="from-emerald-100 via-background to-cyan-50 dark:from-emerald-950/35 dark:via-background dark:to-cyan-950/20"
      stats={[
        {
          title: "Platform Users",
          value: fmt(d.activeUsers),
          detail: "Active users across the platform",
          icon: Users,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Role Policies",
          value: fmt(d.roleCount),
          detail: "Real roles configured in the system",
          icon: ShieldCheck,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          title: "Faculties",
          value: fmt(d.facultyCount),
          detail: "Registered academic faculties",
          icon: Building2,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
        {
          title: "Departments",
          value: fmt(d.departmentCount),
          detail: "Registered across all faculties",
          icon: Building2,
          tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
      ]}
      focusTitle="Platform Oversight"
      focusItems={focusItems}
      quickActions={[
        {
          title: "Manage user access",
          href: "/manager/users/students",
          description: "Review student, tutor, and staff records.",
          icon: UserCog,
          tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Moodle sync status",
          href: "/admin/moodle-sync/assessments",
          description: "Check assessment sync health with Moodle.",
          icon: WifiSyncIcon,
          tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        },
        {
          title: "Review analytics",
          href: "/manager/grades/summary",
          description: "Inspect academic performance trends.",
          icon: BarChart3,
          tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
      ]}
      signalsTitle="System Signals"
      signals={[
        {
          label: "Fee collection rate",
          value:
            d.collectionRate != null
              ? `${d.collectionRate}%`
              : d.isLoading
                ? "…"
                : "—",
        },
        { label: "Active platform users", value: fmt(d.activeUsers) },
        {
          label: "Assessment sync health",
          value:
            d.unsyncedAssessments != null
              ? d.unsyncedAssessments === 0
                ? "All synced"
                : `${d.unsyncedAssessments} pending`
              : d.isLoading
                ? "…"
                : "—",
        },
      ]}
    />
  )
}
