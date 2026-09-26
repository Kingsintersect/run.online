"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"
import type { CreateFeeTypeDto, WaiveInvoiceDto } from "../types"
import { getErrorMessage } from "@/lib/errors"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"

export function useCreateFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFeeTypeDto) =>
      feeManagementService.createFeeType(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.feeTypesAll() })
      toast.success("Fee type created")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create fee type"
      )
    },
  })
}

export function useUpdateFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateFeeTypeDto> }) =>
      feeManagementService.updateFeeType(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: feeKeys.feeType(id) })
      qc.invalidateQueries({ queryKey: feeKeys.feeTypesAll() })
      toast.success("Fee type updated")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update fee type"
      )
    },
  })
}

export function useDeleteFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => feeManagementService.deleteFeeType(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.feeTypesAll() })
      toast.success("Fee type deleted")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete fee type"
      )
    },
  })
}

export function useActivateFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => feeManagementService.activateFeeType(id),
    onSuccess: (_data, id) => {
      // Invalidate the fee type record — polling in useGenerationStatus handles progress
      qc.invalidateQueries({ queryKey: feeKeys.feeType(id) })
      qc.invalidateQueries({ queryKey: feeKeys.feeTypesAll() })
      toast.success("Fee type activated — invoice generation queued")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to activate fee type"
      )
    },
  })
}

export function useDeactivateFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => feeManagementService.deactivateFeeType(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: feeKeys.feeType(id) })
      qc.invalidateQueries({ queryKey: feeKeys.feeTypesAll() })
      toast.success("Fee type deactivated")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate fee type"
      )
    },
  })
}

// ── Invoice mutations ─────────────────────────────────────────────────────────

export const WAIVE_NOT_AVAILABLE_MESSAGE =
  "Waiving invoices isn't available on the server yet. It has been flagged for the backend team."

export function useWaiveInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: WaiveInvoiceDto }) =>
      feeManagementService.waiveInvoice(id, dto),
    onSuccess: (_data, { id }) => {
      // invoicesAll() is the prefix of invoice(id), studentInvoices(),
      // myInvoices() and overdueInvoices(), so every list showing this
      // invoice refetches with its new WAIVED status.
      qc.invalidateQueries({ queryKey: feeKeys.invoicesAll() })
      qc.invalidateQueries({ queryKey: feeKeys.invoice(id) })
      toast.success("Invoice waived")
    },
    onError: (err) => {
      toast.error(
        isEndpointMissing(err)
          ? WAIVE_NOT_AVAILABLE_MESSAGE
          : getErrorMessage(err, "Failed to waive invoice")
      )
    },
  })
}

export function useCancelInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => feeManagementService.cancelInvoice(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: feeKeys.invoice(id) })
      qc.invalidateQueries({ queryKey: feeKeys.invoicesAll() })
      toast.success("Invoice cancelled")
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Failed to cancel invoice"))
    },
  })
}
