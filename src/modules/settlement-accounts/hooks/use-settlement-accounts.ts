"use client"

import { useQuery } from "@tanstack/react-query"
import { settlementAccountsService } from "../services/settlement-accounts.service"
import type { Bank, DataSource, SettlementAccount } from "../types"
import { settlementKeys } from "./query-keys"

const EMPTY_ACCOUNTS: SettlementAccount[] = []
const EMPTY_BANKS: Bank[] = []

/**
 * Settlement accounts for one major program. One interface for both modes:
 * `source` is "live" once the endpoint answers, "fallback" while it 404s
 * (then `accounts` is always empty — never fabricated), null while unknown.
 */
export function useSettlementAccounts(majorProgramId: number | null) {
  const query = useQuery({
    queryKey: settlementKeys.accounts(majorProgramId ?? 0),
    queryFn: () => settlementAccountsService.listAccounts(majorProgramId ?? 0),
    enabled: majorProgramId !== null,
    staleTime: 60 * 1000,
  })

  const source: DataSource | null = query.data?.source ?? null

  return {
    accounts: query.data?.data ?? EMPTY_ACCOUNTS,
    source,
    isFallback: source === "fallback",
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Banks from `GET /payments/banks`, else the static offline list. */
export function useBanks() {
  const query = useQuery({
    queryKey: settlementKeys.banks(),
    queryFn: () => settlementAccountsService.listBanks(),
    staleTime: 60 * 60 * 1000,
  })

  const source: DataSource | null = query.data?.source ?? null

  return {
    banks: query.data?.data ?? EMPTY_BANKS,
    source,
    isFallback: source === "fallback",
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
