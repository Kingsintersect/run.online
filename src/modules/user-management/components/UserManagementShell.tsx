"use client"

import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { PermissionDeniedScreen } from "@/lib/permissions/PermissionDeniedScreen"
import { usePermissions } from "@/lib/permissions/usePermissions"
import TutorsPage from "./TutorList"
import StaffPage from "./StaffList"
import StudentsPage from "./StudentList"
import UsersSummaryPage from "./Summary"
// import { SummaryCharts } from './SummaryCharts'
// import { StudentsTable } from './StudentsTable'
// import { TutorsTable } from './TutorsTable'
// import { StaffTable } from './StaffTable'

export function StatisticsManagementShell() {
  const role = useAppStore((s) => s.user?.role)

  // DEAN (2026-09-17): this shell is also reached directly by URL, not just
  // via nav.config.ts's deanNav (which already drops the "Summary" link) —
  // this is the page-level half of that same fix. UsersSummaryPage exposes
  // "Add User" (any role, including SUPER_ADMIN) and "Manage roles" (assign/
  // revoke any role), which sandbox/BACKEND_DEVIATIONS_2026-09-14.md A27
  // flags as DEAN's single highest-priority unscoped-access gap: DEAN's real
  // backend session currently returns the exact same "users:view" grant as
  // ADMIN (confirmed live), so a permission check alone can't tell them apart
  // yet — excluded by role instead, same as manager/(routes)/dashboard/
  // page.tsx's existing STAFF branch for the same kind of gap. Revisit once
  // the backend grants a real "users:manage" distinct from "users:view" (see
  // that A27 entry) and switch this to a PermissionGate-only check.
  if (role === UserRole.DEAN) {
    return <PermissionDeniedScreen resource="users" />
  }

  return (
    <div className="space-y-8">
      {/* Summary charts — anyone who can see the user directory, or HOD
             reviewing grade-approval stats. "users:manage" here was a
             permission that never existed anywhere in the real catalog
             (2026-09 permission audit) — this is a summary/view surface,
             so users:view (already granted to admin) is the correct check,
             not a manage-level one. DEAN no longer reaches this PermissionGate
             at all — see the role check above. denyBehavior="screen": a
             role without either grant (e.g. STAFF) used to get a blank
             page here instead of the standard denied screen. */}
      <PermissionGate
        require={[
          { resource: "users", action: "view" },
          { resource: "results", action: "approve" },
        ]}
        mode="any"
        denyBehavior="screen"
      >
        <UsersSummaryPage />
      </PermissionGate>
    </div>
  )
}

export function StudentsManagementShell() {
  const { can } = usePermissions()

  // "users:manage" never existed as a real permission — students:view/
  // students:manage (both real, already granted to admin/dean) are the
  // correct checks for this table, mirroring TutorManagementShell's
  // view-to-see/manage-to-edit split below.
  const canCreate = can({ resource: "students", action: "manage" })
  const canExport = can({ resource: "departments", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate require={{ resource: "students", action: "view" }}>
        <StudentsPage canCreate={canCreate} canExport={canExport} />
      </PermissionGate>
    </div>
  )
}

export function StaffManagementShell() {
  return (
    <div className="space-y-8">
      {/* Staff table — staff:view to see it (StaffPage gates its own
             mutating controls on staff:manage). Was departments:manage,
             which ADMIN's live session doesn't hold, so ADMIN got a blank
             page; denyBehavior="screen" so a role without staff:view (e.g.
             STAFF) gets the standard denied screen, never a blank area. */}
      <PermissionGate
        require={{ resource: "staff", action: "view" }}
        denyBehavior="screen"
      >
        <StaffPage />
      </PermissionGate>
    </div>
  )
}

export function TutorManagementShell() {
  const { can } = usePermissions()

  const canCreate = can({ resource: "tutors", action: "manage" })

  return (
    <div className="space-y-8">
      {/* Tutors table — same gate */}
      <PermissionGate require={{ resource: "tutors", action: "view" }}>
        <TutorsPage canCreate={canCreate} />
      </PermissionGate>
    </div>
  )
}
