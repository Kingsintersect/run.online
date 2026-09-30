"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { resultsKeys } from "@/modules/student-grades/hooks/query-keys"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"
import type { InitiatePaymentDto } from "../types"

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (dto: InitiatePaymentDto) =>
      feeManagementService.initiatePayment(dto),
    // No cache invalidation on initiation — invoice status only changes after verification
  })
}

export function useVerifyPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) =>
      feeManagementService.verifyPayment(reference),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: feeKeys.myInvoices() })
      qc.invalidateQueries({ queryKey: feeKeys.invoice(data.invoice.id) })
      qc.invalidateQueries({
        queryKey: feeKeys.paymentHistory(data.invoice.id),
      })
      // The admin Invoices list (filtered — invoiceAdminTable.tsx) needs
      // this too, so a newly-paid invoice's status/amount updates there
      // without a manual refresh.
      qc.invalidateQueries({ queryKey: feeKeys.invoicesAll() })
      // A verify that makes the invoice PAID auto-releases results withheld
      // for fees (bruno backend brief item 7), so the "Results withheld"
      // banner re-checks.
      qc.invalidateQueries({ queryKey: resultsKeys.resultStatusAll() })
    },
  })
}

export function useInvoicePaymentHistory(invoiceId: number) {
  return useQuery({
    queryKey: feeKeys.paymentHistory(invoiceId),
    queryFn: () => feeManagementService.getInvoicePaymentHistory(invoiceId),
    enabled: !!invoiceId,
  })
}

/** The webhook/verify timeline for one payment; fetched only when asked. */
export function usePaymentGatewayLogs(
  paymentId: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: feeKeys.paymentGatewayLogs(paymentId ?? 0),
    queryFn: () =>
      feeManagementService.getPaymentGatewayLogs(paymentId as number),
    enabled: enabled && paymentId !== null && paymentId > 0,
    staleTime: 30 * 1000,
    retry: false,
  })
}

export function usePayment(paymentId: number | null) {
  return useQuery({
    queryKey: feeKeys.payment(paymentId ?? 0),
    queryFn: () => feeManagementService.getPayment(paymentId as number),
    enabled: paymentId !== null && paymentId > 0,
    staleTime: 60 * 1000,
  })
}
