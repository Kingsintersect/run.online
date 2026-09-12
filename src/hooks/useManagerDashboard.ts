"use client"

import { useQuery } from "@tanstack/react-query"
import { rolesQueryOptions } from "@/services/rolesApi"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { usersQueryOptions } from "@/services/usersApi"
import { clearanceKeys } from "@/modules/clearance/hooks/query-keys"
import { clearanceService } from "@/modules/clearance/services/clearance.service"
import { contentKeys } from "@/modules/content/hooks/query-keys"
import { contentService } from "@/modules/content/services/content.service"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import { useOperationsDashboardData } from "./useAdminDashboard"

// Manager (ADMIN role) shares the same operational data as the Admin
// (SUPER_ADMIN) dashboard, plus a real role-count specific to platform
// governance framing — see useAdminDashboard.ts for the shared composition.
export function usePlatformDashboardData() {
  const ops = useOperationsDashboardData()
  const role = useAppStore((s) => s.user?.role)

  // GET /auth/roles also 403s for DEAN (confirmed live) — same gate as the
  // three endpoints useOperationsDashboardData already skips for it.
  const roles = useQuery({
    ...rolesQueryOptions.list(),
    staleTime: 5 * 60 * 1000,
    enabled: role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN,
  })

  const faculties = useQuery({
    ...courseStructureQueryOptions.faculties.list(),
    staleTime: 5 * 60 * 1000,
  })

  return {
    ...ops,
    roleCount: roles.data?.length ?? null,
    facultyCount: faculties.data?.data?.length ?? null,
    isLoading: ops.isLoading || roles.isLoading || faculties.isLoading,
  }
}

// STAFF (2026-09-12): STAFF shares this route (see manager/layout.tsx's
// RoleGuard) but was, until now, shown ADMIN's dashboard verbatim — which
// calls /users/stats, /fees/reports/summary, /assessments/sync/status, and
// /auth/roles, none of which STAFF is authorized to call (confirmed live:
// all four 403 for a STAFF token). This composes only endpoints STAFF's
// real permission set actually allows (students.view, clearance.view,
// announcements.view — see sandbox/pre-data/role-permission-assignments.json
// "STAFF"), so the dashboard STAFF sees only ever calls things STAFF can
// actually use.
export function useStaffDashboardData() {
  const students = useQuery({
    ...usersQueryOptions.students.list({ limit: 1 }),
    staleTime: 60 * 1000,
  })

  // clearanceService.list() returns a plain array (no `meta.total` — see
  // its file header), so this count is "however many rows come back on the
  // backend's default page size" (15, confirmed live), not necessarily the
  // true total on a very large queue. Good enough for a dashboard stat; an
  // admin-facing exact count belongs on the real Clearance page's own
  // pagination, not here.
  const pendingClearances = useQuery({
    queryKey: clearanceKeys.list({ status: "PENDING" }),
    queryFn: () => clearanceService.list({ status: "PENDING" }),
    staleTime: 30 * 1000,
  })

  const announcements = useQuery({
    queryKey: contentKeys.published({ limit: 3 }),
    queryFn: () => contentService.listPublished({ limit: 3 }),
    staleTime: 60 * 1000,
  })

  return {
    totalStudents: students.data?.total ?? null,
    pendingClearanceCount: pendingClearances.data?.length ?? null,
    recentAnnouncements: announcements.data?.data ?? [],
    isLoading:
      students.isLoading || pendingClearances.isLoading || announcements.isLoading,
  }
}
