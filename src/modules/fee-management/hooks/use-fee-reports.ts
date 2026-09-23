"use client"

import { useQuery } from "@tanstack/react-query"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"

export function useCollectionsSummary(
  filters?: {
    sessionId?: number
    feeTypeId?: number
    majorProgramId?: number
  },
  // Added 2026-09-12 so callers that only sometimes have permission for this
  // endpoint can skip the request entirely instead of it firing and
  // failing. GET /fees/reports/summary 403ing for DEAN/BURSARY/DIRECTOR was
  // confirmed fixed live 2026-09-22 (A37) — this param is kept as a general
  // mechanism (still used by useOperationsDashboardData for STAFF, which is
  // still 403'd), not because this specific endpoint needs it anymore.
  // Default true keeps every existing caller unchanged.
  enabled = true
) {
  return useQuery({
    queryKey: feeKeys.collectionsSummary(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.getCollectionsSummary(filters),
    staleTime: 1000 * 60 * 2,
    enabled,
  })
}

export function useOutstandingReport(filters?: { majorProgramId?: number }) {
  return useQuery({
    queryKey: feeKeys.outstandingReport(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.getOutstandingReport(filters),
    staleTime: 1000 * 60 * 2,
  })
}
