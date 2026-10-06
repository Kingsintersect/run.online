"use client"

import { create } from "zustand"
import type { PaymentStatus, RecordedPaymentMethod } from "../types"

// Domain-scoped UI state for the Payments ledger screen (CLAUDE.md §4):
// filter values, the current page and the open row. The rows themselves live
// in the React Query cache, never here.

export interface PaymentLedgerFilterState {
  majorProgramId?: number
  sessionId?: number
  method?: RecordedPaymentMethod
  status?: PaymentStatus
  dateFrom?: string
  dateTo?: string
  /** Raw search box text; the screen debounces it before querying. */
  search: string
}

const EMPTY_FILTERS: PaymentLedgerFilterState = { search: "" }

interface PaymentLedgerUiState {
  filters: PaymentLedgerFilterState
  page: number
  limit: number
  selectedPaymentId: number | null
  /** Merges a filter change and returns to page 1. */
  setFilters: (patch: Partial<PaymentLedgerFilterState>) => void
  resetFilters: () => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  selectPayment: (id: number | null) => void
}

export const usePaymentLedgerUiStore = create<PaymentLedgerUiState>((set) => ({
  filters: EMPTY_FILTERS,
  page: 1,
  limit: 20,
  selectedPaymentId: null,
  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch }, page: 1 })),
  resetFilters: () => set({ filters: EMPTY_FILTERS, page: 1 }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  selectPayment: (id) => set({ selectedPaymentId: id }),
}))
