"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
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
  return (
    <div className="space-y-8">
      {/* Summary charts — anyone who can see the user directory, or HOD
             reviewing grade-approval stats. "users:manage" here was a
             permission that never existed anywhere in the real catalog
             (2026-09 permission audit) — this is a summary/view surface,
             so users:view (already granted to admin/dean) is the correct
             check, not a manage-level one. */}
      <PermissionGate
        require={[
          { resource: "users", action: "view" },
          { resource: "results", action: "approve" },
        ]}
        mode="any"
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
      {/* Staff table — departments:manage (SUPER_ADMIN only, permission id 10) */}
      <PermissionGate require={{ resource: "departments", action: "manage" }}>
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
