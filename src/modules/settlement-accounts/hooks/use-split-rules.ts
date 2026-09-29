"use client"

import { useQuery } from "@tanstack/react-query"
import { settlementAccountsService } from "../services/settlement-accounts.service"
import type { DataSource, SplitRule } from "../types"
import { settlementKeys } from "./query-keys"

const EMPTY_RULES: SplitRule[] = []

/**
 * Split rules for one major program — same single interface as
 * `useSettlementAccounts`: "fallback" while the endpoint 404s, with an empty
 * list (the editor still works as a preview calculator).
 */
export function useSplitRules(majorProgramId: number | null) {
  const query = useQuery({
    queryKey: settlementKeys.splitRules(majorProgramId ?? 0),
    queryFn: () =>
      settlementAccountsService.listSplitRules(majorProgramId ?? 0),
    enabled: majorProgramId !== null,
    staleTime: 60 * 1000,
  })

  const source: DataSource | null = query.data?.source ?? null

  return {
    rules: query.data?.data ?? EMPTY_RULES,
    source,
    isFallback: source === "fallback",
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
