"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"
import type { CreateFeeTypeDto } from "../types"

export function useCreateFeeType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateFeeTypeDto) =>
      feeManagementService.createFeeType(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feeKeys.feeTypes() })
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
      qc.invalidateQueries({ queryKey: feeKeys.feeTypes() })
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
      qc.invalidateQueries({ queryKey: feeKeys.feeTypes() })
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
      qc.invalidateQueries({ queryKey: feeKeys.feeTypes() })
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
      qc.invalidateQueries({ queryKey: feeKeys.feeTypes() })
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

export function useWaiveInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      feeManagementService.waiveInvoice(id, reason),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: feeKeys.invoice(id) })
      qc.invalidateQueries({ queryKey: feeKeys.invoices() })
      toast.success("Invoice waived")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to waive invoice"
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
      qc.invalidateQueries({ queryKey: feeKeys.invoices() })
      toast.success("Invoice cancelled")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel invoice"
      )
    },
  })
}
