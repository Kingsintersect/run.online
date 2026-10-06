"use client"

import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ApiClientError } from "@/lib/clients/apiClient"
import { feeManagementService } from "../services/fee-management.service"
import { feeKeys } from "./query-keys"
import type { PaymentLedgerFilters } from "../types"

/** One page of the cross-student payment ledger (GET /fees/payments). */
export function usePaymentLedger(filters: PaymentLedgerFilters) {
  return useQuery({
    queryKey: feeKeys.paymentLedger({ ...filters }),
    queryFn: () => feeManagementService.listPayments(filters),
    staleTime: 30 * 1000,
    // Keep the old page on screen while the next one loads.
    placeholderData: keepPreviousData,
    // A refusal (403 / OUT_OF_SCOPE) or a 4xx can't change on retry.
    retry: (count, error) =>
      !(
        error instanceof ApiClientError &&
        error.status !== undefined &&
        error.status < 500
      ) && count < 2,
  })
}

/** `value`, updated only after it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
