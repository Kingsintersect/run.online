"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { settlementAccountsService } from "../services/settlement-accounts.service"
import type {
  CreateSettlementAccount,
  ResolveAccount,
  UpdateSettlementAccount,
  UpsertSplitRule,
} from "../types"
import { settlementKeys } from "./query-keys"

// Errors are never toasted here: every caller shows them inline next to the
// thing that failed (dialog, card, confirm), via classifySettlementError()
// in ../lib/settlement-errors.ts — so a dialog can stay open with the
// entered data, and a field-level 422 lands on its field.

export function useCreateSettlementAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSettlementAccount) =>
      settlementAccountsService.createAccount(payload),
    onSuccess: (account) => {
      qc.invalidateQueries({ queryKey: settlementKeys.accountsAll() })
      toast.success(`Settlement account "${account.label}" added`)
    },
  })
}

export function useUpdateSettlementAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; payload: UpdateSettlementAccount }) =>
      settlementAccountsService.updateAccount(v.id, v.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementKeys.accountsAll() })
      toast.success("Settlement account updated")
    },
  })
}

export function useDeleteSettlementAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settlementAccountsService.deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementKeys.accountsAll() })
      toast.success("Settlement account deleted")
    },
  })
}

/** Re-attempts PENDING/FAILED gateway links for one account. */
export function useRetrySettlementProvisioning() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settlementAccountsService.retryProvisioning(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementKeys.accountsAll() })
      toast.success("Provisioning retried")
    },
  })
}

/** Name enquiry (rate limited 10/min; currently always 502 NAME_ENQUIRY_UNAVAILABLE). */
export function useResolveAccountName() {
  return useMutation({
    mutationFn: (payload: ResolveAccount) =>
      settlementAccountsService.resolveAccount(payload),
  })
}

export function useUpsertSplitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertSplitRule) =>
      settlementAccountsService.upsertSplitRule(payload),
    onSuccess: (_rule, payload) => {
      qc.invalidateQueries({ queryKey: settlementKeys.splitRulesAll() })
      toast.success(payload.id ? "Split rule updated" : "Split rule created")
    },
  })
}

export function useDeleteSplitRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => settlementAccountsService.deleteSplitRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settlementKeys.splitRulesAll() })
      toast.success("Split rule deleted")
    },
  })
}
