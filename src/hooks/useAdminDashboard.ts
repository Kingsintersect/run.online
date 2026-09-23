"use client"

import { useQuery } from "@tanstack/react-query"
import { usersApi, usersKeys } from "@/services/usersApi"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import {
  applicationReviewApi,
  applicationReviewKeys,
} from "@/services/applicationReviewApi"
import { useCollectionsSummary } from "@/modules/fee-management/hooks/use-fee-reports"
import { useAssessmentSyncStatus } from "@/modules/moodle-sync/hooks/use-sync-assessments"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"

// Composes several already-real endpoints into the small set of live numbers
// the Admin/Manager landing dashboards show — see
// sandbox/MISSING_BACKEND_APIS.md §2.15 note on RoleDashboard for context.
// No single "dashboard summary" endpoint exists (or is needed) for this; each
// of these is a real, independently-useful query elsewhere in the app.
//
// This hook backs three pages: SUPER_ADMIN's /admin/dashboard, and (via
// usePlatformDashboardData) ADMIN and DEAN's shared /manager/dashboard —
// see manager/(routes)/dashboard/page.tsx. Gated by role rather than a
// permission check because the exact backend permission each endpoint
// enforces isn't documented anywhere this session found — role is what was
// empirically confirmed to work.
//
// Re-verified live 2026-09-22 (BACKEND_DEVIATIONS_2026-09-14.md A37) — the
// 2026-09-12 finding that all of /users/stats, /fees/reports/summary,
// /assessments/sync/status, and GET /admissions/applications?status=pending
// 403 for DEAN is now only PARTLY true: /users/stats and
// /fees/reports/summary now return 200 for DEAN (same backend fix as the
// BURSARY/DIRECTOR fee-reports bug). /assessments/sync/status and the
// pending-applications list are still 403 for DEAN, confirmed the same day
// — those two stay admin-only.
export function useOperationsDashboardData() {
  const role = useAppStore((s) => s.user?.role)
  const isAdminOrSuperAdmin =
    role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN
  const canSeeAdminStats = isAdminOrSuperAdmin || role === UserRole.DEAN

  const stats = useQuery({
    queryKey: usersKeys.stats(),
    queryFn: () => usersApi.getStats(),
    staleTime: 60 * 1000,
    enabled: canSeeAdminStats,
  })

  const departments = useQuery({
    ...courseStructureQueryOptions.departments.list(),
    staleTime: 5 * 60 * 1000,
  })

  // Still 403 for DEAN, confirmed live 2026-09-22 — stays admin-only.
  const pendingApplications = useQuery({
    queryKey: applicationReviewKeys.list({ status: "pending" }),
    queryFn: () => applicationReviewApi.list({ status: "pending" }),
    staleTime: 60 * 1000,
    enabled: isAdminOrSuperAdmin,
  })

  const collections = useCollectionsSummary(undefined, canSeeAdminStats)
  // Still 403 for DEAN, confirmed live 2026-09-22 — stays admin-only.
  const assessmentSync = useAssessmentSyncStatus(isAdminOrSuperAdmin)

  const totalStudents = stats.data?.data?.total_students ?? null
  const totalTutors = stats.data?.data?.total_tutors ?? null
  const activeUsers = stats.data?.data?.active_users ?? null
  const departmentCount = departments.data?.data?.length ?? null
  const pendingApplicationCount = pendingApplications.data?.meta?.total ?? null
  // Real response per bruno/fee/Reports - Summary.bru is a flat aggregate,
  // not a `.totals` wrapper — see sandbox/TRIPLE_AUDIT_2026-09-13.md §1b.
  const totalInvoiced =
    collections.data?.data?.totalInvoiced != null
      ? Number(collections.data.data.totalInvoiced)
      : null
  const totalCollected =
    collections.data?.data?.totalCollected != null
      ? Number(collections.data.data.totalCollected)
      : null
  const totalOutstanding =
    totalInvoiced != null && totalCollected != null
      ? Math.max(totalInvoiced - totalCollected, 0)
      : null
  const collectionRate =
    totalInvoiced && totalInvoiced > 0 && totalCollected != null
      ? Math.round((totalCollected / totalInvoiced) * 100)
      : null
  const unsyncedAssessments =
    assessmentSync.data?.summary?.byStatus?.PENDING != null &&
    assessmentSync.data?.summary?.byStatus?.FAILED != null
      ? assessmentSync.data.summary.byStatus.PENDING +
        assessmentSync.data.summary.byStatus.FAILED
      : null

  return {
    totalStudents,
    totalTutors,
    activeUsers,
    departmentCount,
    pendingApplicationCount,
    totalOutstanding,
    collectionRate,
    unsyncedAssessments,
    isLoading:
      stats.isLoading ||
      departments.isLoading ||
      pendingApplications.isLoading ||
      collections.isLoading ||
      assessmentSync.isLoading,
  }
}
