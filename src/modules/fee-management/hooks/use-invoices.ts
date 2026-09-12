"use client"

import { useQuery } from "@tanstack/react-query"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"

export function useMyInvoices() {
  return useQuery({
    queryKey: feeKeys.myInvoices(),
    queryFn: feeManagementService.getMyInvoices,
  })
}

export function useInvoices(filters?: {
  status?: string
  feeTypeId?: number
  sessionId?: number
  studentId?: number
}) {
  return useQuery({
    queryKey: feeKeys.invoices(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.listInvoices(filters),
    staleTime: 1000 * 60,
  })
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: feeKeys.invoice(id),
    queryFn: () => feeManagementService.getInvoice(id),
    enabled: !!id,
  })
}

// `enabled` added 2026-09-12 — see the matching note on useCollectionsSummary
// in use-fee-reports.ts. Confirmed live this 403s for both DEAN and,
// surprisingly, BURSARY itself (the role this data exists for) — see
// sandbox/fee-management/bursary_403_bug_report.md.
export function useOverdueInvoices(enabled = true) {
  return useQuery({
    queryKey: feeKeys.overdueInvoices(),
    queryFn: feeManagementService.getOverdueInvoices,
    staleTime: 1000 * 60 * 2,
    enabled,
  })
}

export function useStudentInvoices(studentId: number) {
  return useQuery({
    queryKey: feeKeys.studentInvoices(studentId),
    queryFn: () => feeManagementService.getStudentInvoices(studentId),
    enabled: !!studentId,
  })
}
