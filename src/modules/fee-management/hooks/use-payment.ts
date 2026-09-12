"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

export function usePayment(paymentId: number | null) {
  return useQuery({
    queryKey: feeKeys.payment(paymentId ?? 0),
    queryFn: () => feeManagementService.getPayment(paymentId as number),
    enabled: paymentId !== null && paymentId > 0,
    staleTime: 60 * 1000,
  })
}
