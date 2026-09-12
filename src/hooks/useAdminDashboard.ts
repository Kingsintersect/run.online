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
// see manager/(routes)/dashboard/page.tsx. Confirmed live (2026-09-12) that
// /users/stats, /fees/reports/summary, and /assessments/sync/status all
// 403 for DEAN (STAFF hit the same wall — see that page's own STAFF branch
// for why STAFF got a fully separate dashboard instead of this gate; DEAN's
// permission set is broad enough, and close enough to ADMIN's, that a full
// rebuild wasn't worth it — just skip the specific calls DEAN can't make).
// Gated by role rather than a permission check because the exact backend
// permission each of these three endpoints actually enforces isn't
// documented anywhere this session found — role is what was empirically
// confirmed to work.
export function useOperationsDashboardData() {
  const role = useAppStore((s) => s.user?.role)
  const canSeeAdminStats =
    role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN

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

  // CORRECTION (2026-09-12): assumed DEAN could reach this — DEAN's
  // permission catalog entry is literally "admissions.view" — but
  // confirmed live it 403s for DEAN too, so gated the same as the four
  // above. The catalog permission name and what the backend route
  // actually enforces don't always match for DEAN; don't assume from the
  // catalog again for this dashboard, verify live.
  const pendingApplications = useQuery({
    queryKey: applicationReviewKeys.list({ status: "pending" }),
    queryFn: () => applicationReviewApi.list({ status: "pending" }),
    staleTime: 60 * 1000,
    enabled: canSeeAdminStats,
  })

  const collections = useCollectionsSummary(undefined, canSeeAdminStats)
  const assessmentSync = useAssessmentSyncStatus(canSeeAdminStats)

  const totalStudents = stats.data?.data?.total_students ?? null
  const totalTutors = stats.data?.data?.total_tutors ?? null
  const activeUsers = stats.data?.data?.active_users ?? null
  const departmentCount = departments.data?.data?.length ?? null
  const pendingApplicationCount = pendingApplications.data?.meta?.total ?? null
  const totalOutstanding =
    collections.data?.totals?.totalOutstanding != null
      ? Number(collections.data.totals.totalOutstanding)
      : null
  const totalInvoiced =
    collections.data?.totals?.totalInvoiced != null
      ? Number(collections.data.totals.totalInvoiced)
      : null
  const totalPaid =
    collections.data?.totals?.totalPaid != null
      ? Number(collections.data.totals.totalPaid)
      : null
  const collectionRate =
    totalInvoiced && totalInvoiced > 0 && totalPaid != null
      ? Math.round((totalPaid / totalInvoiced) * 100)
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
