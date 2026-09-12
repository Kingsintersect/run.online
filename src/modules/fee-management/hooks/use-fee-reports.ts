"use client"

import { useQuery } from "@tanstack/react-query"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"

export function useCollectionsSummary(
  filters?: {
    sessionId?: number
    feeTypeId?: number
  },
  // Added 2026-09-12 so callers that only sometimes have permission for this
  // endpoint (e.g. the shared admin/manager dashboard, which DEAN also
  // renders but can't call /fees/reports/summary — confirmed live, 403)
  // can skip the request entirely instead of it firing and failing. Default
  // true keeps every existing caller unchanged.
  enabled = true
) {
  return useQuery({
    queryKey: feeKeys.collectionsSummary(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.getCollectionsSummary(filters),
    staleTime: 1000 * 60 * 2,
    enabled,
  })
}

export function useOutstandingReport() {
  return useQuery({
    queryKey: feeKeys.outstandingReport(),
    queryFn: feeManagementService.getOutstandingReport,
    staleTime: 1000 * 60 * 2,
  })
}
