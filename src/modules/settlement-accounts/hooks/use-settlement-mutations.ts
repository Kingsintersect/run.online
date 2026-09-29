"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  describeApiError,
  isAccountInSplitRule,
  isWriteRouteMissing,
  settlementAccountsService,
} from "../services/settlement-accounts.service"
import type {
  CreateSettlementAccount,
  ResolveAccount,
  UpdateSettlementAccount,
  UpsertSplitRule,
} from "../types"
import { settlementKeys } from "./query-keys"

export const NOT_AVAILABLE_MESSAGE =
  "This isn't available on the server yet (sandbox/payment-routing). Nothing was saved."

function toastError(error: Error, fallback: string) {
  toast.error(
    isWriteRouteMissing(error)
      ? NOT_AVAILABLE_MESSAGE
      : describeApiError(error, fallback)
  )
}

export function useCreateSettlementAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSettlementAccount) =>
      settlementAccountsService.createAccount(payload),
    onSuccess: (account) => {
      qc.invalidateQueries({ queryKey: settlementKeys.accountsAll() })
      toast.success(`Settlement account "${account.label}" added`)
    },
    onError: (error) => toastError(error, "Failed to add settlement account"),
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
    onError: (error) =>
      toastError(error, "Failed to update settlement account"),
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
    onError: (error) => {
      // 409 ACCOUNT_IN_SPLIT_RULE is shown inline in the confirm dialog.
      if (isAccountInSplitRule(error)) return
      toastError(error, "Failed to delete settlement account")
    },
  })
}

/** Name enquiry. Errors (422 not found) are shown inline by the caller. */
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
    onError: (error) => toastError(error, "Failed to save split rule"),
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
    onError: (error) => toastError(error, "Failed to delete split rule"),
  })
}
