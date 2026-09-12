"use client"

import { useQuery } from "@tanstack/react-query"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"
import type { FeeCategory, StudentType } from "../types"

export function useFeeTypes(filters?: {
  sessionId?: number
  category?: string
  isActive?: boolean
}) {
  return useQuery({
    queryKey: feeKeys.feeTypes(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.listFeeTypes(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useFeeType(id: number) {
  return useQuery({
    queryKey: feeKeys.feeType(id),
    queryFn: () => feeManagementService.getFeeType(id),
    enabled: !!id,
  })
}

export function useGenerationStatus(id: number, enabled: boolean) {
  return useQuery({
    queryKey: feeKeys.generationStatus(id),
    queryFn: () => feeManagementService.getGenerationStatus(id),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      // Poll every 2 s while job is in-flight; stop once done or failed
      return status === "QUEUED" || status === "RUNNING" ? 2000 : false
    },
  })
}

interface EligibleCountFilters {
  category: FeeCategory
  sessionId?: number
  programId?: number
  levelId?: number
  studentType?: StudentType
}

export function useEligibleCount(filters: EligibleCountFilters | null) {
  return useQuery({
    queryKey: feeKeys.eligibleCount(filters as Record<string, unknown> | null),
    queryFn: () => feeManagementService.getEligibleCount(filters!),
    enabled: !!filters,
    retry: false, // don't retry — endpoint may not exist yet
    staleTime: 30 * 1000,
  })
}
