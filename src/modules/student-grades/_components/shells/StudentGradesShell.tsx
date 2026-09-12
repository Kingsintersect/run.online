"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import PublishResultsPage from "./PublishResults"
import GradesResultsPage from "./Results"
import GradesSummaryPage from "./StudentGrade"
import GradingSchemesPage from "./GradingSchemes"
import StudentResultsPage from "../StudentResultsPage"
import { BulkGradeForm } from "../BulkGradeForm"
import { TutorCourseGradeBook } from "../TutorCourseGradeBook"

// ========== GRADE SUMMARY SHELL (Student View) ==========
// Shows: Grade distribution, top performers, grade scale
// Requires: my-results:view — was checking "results:view.own", which never
// existed as a real permission (see permission-audit findings, 2026-09-01);
// students' actual self-view permission follows the established "my-X"
// family (my-application, my-courses, my-timetable, my-assessments, etc.).
export function GradeSummaryShell() {
  const { can } = usePermissions()

  const canViewOwn = can({ resource: "my-results", action: "view" })

  return (
    <div className="space-y-8">
      <PermissionGate require={{ resource: "my-results", action: "view" }}>
        <GradesSummaryPage canViewOwn={canViewOwn} />
      </PermissionGate>
    </div>
  )
}

// ========== RESULTS SHELL (Admin/Tutor View) ==========
// Shows: Grades table, filters, grouped view, export
// Requires: results:view.all OR results:manage (both real, granted
// permissions as of 2026-09-01 — view.all was a previously-orphaned
// permission (id 1) never granted to any role until the audit found it).
export function ResultShell() {
  const { can } = usePermissions()

  const canViewAll = can({ resource: "results", action: "view.all" })
  const canManage = can({ resource: "results", action: "manage" })
  const canExport = can({ resource: "results", action: "export" })
  // "results:analyze" never existed as a real permission — the grouped/
  // analytics view this gates is the same concept the system-wide
  // analytics.view permission already covers (granted to admin/dean).
  const canAnalyze = can({ resource: "analytics", action: "view" })

  return (
    <div className="space-y-8">
      <PermissionGate
        require={[
          { resource: "results", action: "view.all" },
          { resource: "results", action: "manage" },
        ]}
        mode="any"
      >
        <GradesResultsPage
          canViewAll={canViewAll}
          canManage={canManage}
          canExport={canExport}
          canAnalyze={canAnalyze}
        />
      </PermissionGate>
    </div>
  )
}

// ========== PUBLISH RESULTS SHELL ==========
// Shows: Course selector, student grades, publish button
// Requires: results:publish (permission 4)
export function PublishResultShell() {
  const { can } = usePermissions()

  const canPublish = can({ resource: "results", action: "publish" })
  const canManage = can({ resource: "results", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate require={{ resource: "results", action: "publish" }}>
        <PublishResultsPage canPublish={canPublish} canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== STUDENT RESULT SHELL ==========
// Shows: Student's own published grades grouped by semester + CGPA history
// Requires: my-results:view — see GradeSummaryShell's note above.
export function StudentResultShell() {
  return (
    <PermissionGate
      require={{ resource: "my-results", action: "view" }}
      fallback={
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <p className="text-sm">You do not have permission to view results.</p>
        </div>
      }
    >
      <StudentResultsPage />
    </PermissionGate>
  )
}

// ========== TUTOR GRADE BOOK SHELL ==========
// Shows: course-scoped grade book — pick one of your offerings, see every
// student's grade for that course + semester in one call
// (GET /results/grades/course/:c/semester/:s).
// Requires: results:manage (permission 3)
export function TutorGradeBookShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "results", action: "manage" })
  const canExport = can({ resource: "results", action: "export" })

  return (
    <PermissionGate
      require={{ resource: "results", action: "manage" }}
      fallback={
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <p className="text-sm">
            You do not have permission to access the grade book.
          </p>
        </div>
      }
    >
      <TutorCourseGradeBook canManage={canManage} canExport={canExport} />
    </PermissionGate>
  )
}

// ========== GRADING SCHEMES SHELL (Admin config) ==========
// Shows: pluggable grading schemes (GPA / simple average / pass-fail) + scales
// Requires: results:manage (permission 3) — same gate as ResultShell's manage side
export function GradingSchemesShell() {
  const { can } = usePermissions()

  const canManage = can({ resource: "results", action: "manage" })

  return (
    <div className="space-y-8">
      <PermissionGate
        require={{ resource: "results", action: "manage" }}
        fallback={
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <p className="text-sm">
              You do not have permission to manage grading schemes.
            </p>
          </div>
        }
      >
        <GradingSchemesPage canManage={canManage} />
      </PermissionGate>
    </div>
  )
}

// ========== TUTOR SUBMIT RESULTS SHELL ==========
// Shows: Course + semester selector, student score inputs, submit button
// Requires: results:manage (permission 3)
export function TutorSubmitShell() {
  return (
    <PermissionGate
      require={{ resource: "results", action: "manage" }}
      fallback={
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
          <p className="text-sm">
            You do not have permission to submit grades.
          </p>
        </div>
      }
    >
      <BulkGradeForm />
    </PermissionGate>
  )
}
