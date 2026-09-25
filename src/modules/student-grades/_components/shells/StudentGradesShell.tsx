"use client"

import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { usePermissions } from "@/lib/permissions/usePermissions"
import GradesResultsPage from "./Results"
import GradesSummaryPage from "./StudentGrade"
import StudentResultsPage from "../StudentResultsPage"
import { ResultsWorkspace } from "../results/results-workspace"
import { ResultSheetView } from "../results/result-sheet-view"
import { AdjustmentApprovalsQueue } from "../results/adjustment-approvals-queue"
import { PublishResultsPanel } from "../results/publish-results-panel"
import { ResultConfiguration } from "../results/result-configuration"
import {
  ANALYTICS_PERMISSIONS,
  RESULTS_PERMISSIONS as P,
} from "../../lib/results-permissions"

// Every results screen is gated by the contract C6 permissions in
// RESULTS_PERMISSIONS — never by role. Route pages wrap these shells in
// <RoleGuard> for route ownership; these gates decide what's inside.
//
// 2026-09-24: TutorGradeBookShell and TutorSubmitShell were removed — tutors
// grade only in Moodle. HOD and DEAN share the tutor routes; what each role
// can do on /tutor/results comes from its permissions.

// ========== GRADE SUMMARY (analytics) ==========
// Was gated on my-results.view (a student permission) — corrected to the
// analytics permission: C6 results.analytics.view, or the older
// grades-summary.view (either is accepted).
export function GradeSummaryShell() {
  const { canAny } = usePermissions()
  return (
    <div className="space-y-8">
      <PermissionGate
        require={ANALYTICS_PERMISSIONS}
        mode="any"
        denyBehavior="screen"
      >
        <GradesSummaryPage canView={canAny(...ANALYTICS_PERMISSIONS)} />
      </PermissionGate>
    </div>
  )
}

// ========== ALL GRADES (legacy flat table, read-only) ==========
export function AllGradesShell() {
  const { can } = usePermissions()
  const canViewAll = can({ resource: "results", action: "view.all" })
  const canView = can(P.view)
  return (
    <div className="space-y-8">
      <PermissionGate
        require={[{ resource: "results", action: "view.all" }, P.view]}
        mode="any"
        denyBehavior="screen"
      >
        <GradesResultsPage
          canViewAll={canViewAll || canView}
          canManage={false}
          canExport={can(P.export)}
          canAnalyze={can({ resource: "analytics", action: "view" })}
        />
      </PermissionGate>
    </div>
  )
}

// ========== RESULTS WORKSPACE (screen A) ==========
export function ResultsWorkspaceShell({
  sheetBasePath,
}: {
  sheetBasePath: string
}) {
  return (
    <PermissionGate require={P.view} denyBehavior="screen">
      <ResultsWorkspace sheetBasePath={sheetBasePath} />
    </PermissionGate>
  )
}

// ========== RESULT SHEET (screen B) ==========
export function ResultSheetShell({
  offeringId,
  backHref,
}: {
  offeringId: number
  backHref: string
}) {
  return (
    <PermissionGate require={P.view} denyBehavior="screen">
      <ResultSheetView offeringId={offeringId} backHref={backHref} />
    </PermissionGate>
  )
}

// ========== ADJUSTMENT APPROVALS (screen C) ==========
export function AdjustmentApprovalsShell() {
  return (
    <PermissionGate require={P.adjustApprove} denyBehavior="screen">
      <AdjustmentApprovalsQueue />
    </PermissionGate>
  )
}

// ========== PUBLISH RESULTS (screen D) ==========
export function PublishResultShell() {
  return (
    <PermissionGate require={P.publish} denyBehavior="screen">
      <PublishResultsPanel />
    </PermissionGate>
  )
}

// ========== RESULT CONFIGURATION (screen E) ==========
export function ResultConfigurationShell() {
  return (
    <PermissionGate
      require={[P.schemesManage, P.policiesManage, P.view]}
      mode="any"
      denyBehavior="screen"
    >
      <ResultConfiguration />
    </PermissionGate>
  )
}

// ========== STUDENT RESULTS (screen G) ==========
export function StudentResultShell() {
  return (
    <PermissionGate require={P.viewOwn} denyBehavior="modal">
      <StudentResultsPage />
    </PermissionGate>
  )
}
