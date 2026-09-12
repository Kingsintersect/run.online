"use client"

import { useQuery } from "@tanstack/react-query"
import { clearanceService } from "../services/clearance.service"
import { clearanceKeys } from "./query-keys"
import type { ClearanceQueryFilters } from "../types"

export function useClearanceTypes() {
  return useQuery({
    queryKey: clearanceKeys.types(),
    queryFn: () => clearanceService.listTypes(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useClearances(filters?: ClearanceQueryFilters) {
  return useQuery({
    queryKey: clearanceKeys.list(filters),
    queryFn: () => clearanceService.list(filters),
    staleTime: 30 * 1000,
  })
}

export function useClearance(id: number | null) {
  return useQuery({
    queryKey: clearanceKeys.detail(id ?? 0),
    queryFn: () => clearanceService.getById(id!),
    enabled: !!id,
  })
}

export function useStudentClearances(studentId: number | null) {
  return useQuery({
    queryKey: clearanceKeys.byStudent(studentId ?? 0),
    queryFn: () => clearanceService.listByStudent(studentId!),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })
}

export function useClearanceSummary(studentId: number | null) {
  return useQuery({
    queryKey: clearanceKeys.summary(studentId ?? 0),
    queryFn: () => clearanceService.getSummary(studentId!),
    enabled: !!studentId,
    staleTime: 30 * 1000,
  })
}
