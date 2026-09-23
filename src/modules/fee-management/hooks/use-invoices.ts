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
  // Major-Program Scoping — see fee-management-ui.store.ts's note.
  majorProgramId?: number
  // See fee-management.service.ts's note.
  facultyName?: string
  departmentName?: string
  level?: number
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
// in use-fee-reports.ts. GET /fees/invoices/overdue 403ing for DEAN and
// BURSARY (sandbox/fee-management/bursary_403_bug_report.md) was confirmed
// fixed live 2026-09-22 (A37) — this param is kept as a general mechanism,
// not because this endpoint needs it anymore.
export function useOverdueInvoices(
  filters?: { majorProgramId?: number },
  enabled = true
) {
  return useQuery({
    queryKey: feeKeys.overdueInvoices(filters as Record<string, unknown>),
    queryFn: () => feeManagementService.getOverdueInvoices(filters),
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
