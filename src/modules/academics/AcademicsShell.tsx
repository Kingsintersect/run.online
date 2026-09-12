"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import AcademicSessionPage from "./_components/academic-year/AcademinYearPageContainer"
import AdmissionsPage from "./_components/admissions/AdmissionPageContainer"
import CourseStructurePage from "./_components/course-structure/CourseStructure"
import CourseManagementPage from "./_components/courses-management/CourseManagement"
import AcademicStructurePage from "./_components/academic-structure/AcademicStructure"

// ========== ACADEMIC SESSION SHELL ==========
// Requires: academic-sessions:manage — see src/lib/utils/permissions.json.
// Was checking a non-existent "academics:configure" permission (a typo/stale
// rename that never matched any entry in the real catalog), which silently
// blanked this page for every role except SUPER_ADMIN regardless of what
// permissions they actually held — see AcademicsShell.tsx audit notes.
export function AcademicSessionShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "academic-sessions", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate
        require={{ resource: "academic-sessions", action: "manage" }}
      >
        <AcademicSessionPage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== ADMISSIONS SHELL ==========
// Requires: admissions:manage
// Was also OR'd with a "students:admit" permission that never existed in
// the real catalog (dead branch — harmless since admissions:manage already
// covers this, but removed per the 2026-09-01 permission audit).
export function AdmissionsShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "admissions", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate require={{ resource: "admissions", action: "manage" }}>
        <AdmissionsPage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== COURSE STRUCTURE SHELL ==========
// Requires: course-structure:manage — see src/lib/utils/permissions.json.
// Was checking "course_structure" (underscore), which doesn't exist in the
// real catalog (the resource is hyphenated) — same class of bug as
// AcademicSessionShell above.
export function CourseStructureShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "course-structure", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate
        require={{ resource: "course-structure", action: "manage" }}
      >
        <CourseStructurePage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== ACADEMIC STRUCTURE SHELL ==========
// Requires: course-structure:manage — reused rather than a new permission
// since this is a direct extension of the same admin domain. Same
// underscore/hyphen fix as CourseStructureShell above.
export function AcademicStructureShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "course-structure", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate
        require={{ resource: "course-structure", action: "manage" }}
      >
        <AcademicStructurePage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== COURSE MANAGEMENT SHELL ==========
// Requires: course_structure:manage (permission 29) or a dedicated course_management:manage permission
export function CourseManagementShell() {
  const { can } = usePermissions()

  // Use departments:manage permission (ID 10) or a dedicated course management permission
  const canManage = can({ resource: "departments", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate require={{ resource: "departments", action: "manage" }}>
        <CourseManagementPage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}
