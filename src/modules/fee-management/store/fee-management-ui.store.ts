"use client"

import { create } from "zustand"
import type { FeeCategory, InvoiceStatus } from "../types"

interface InvoiceTableFilters {
  status?: InvoiceStatus
  feeTypeId?: number
  sessionId?: number
  studentId?: number
}

interface FeeTypeTableFilters {
  sessionId?: number
  category?: FeeCategory
  isActive?: boolean
}

interface FeeManagementUiState {
  // ── Admin: invoice table filters ──────────────────────────────────────────
  invoiceTableFilters: InvoiceTableFilters
  setInvoiceTableFilters: (filters: InvoiceTableFilters) => void

  // ── Admin: fee type table filters ─────────────────────────────────────────
  feeTypeTableFilters: FeeTypeTableFilters
  setFeeTypeTableFilters: (filters: FeeTypeTableFilters) => void

  // ── Student: payment modal ─────────────────────────────────────────────────
  paymentModalInvoiceId: number | null
  openPaymentModal: (invoiceId: number) => void
  closePaymentModal: () => void

  // ── Admin: active generation status panel ─────────────────────────────────
  generationStatusFeeTypeId: number | null
  setGenerationStatusFeeTypeId: (id: number | null) => void
}

export const useFeeManagementUiStore = create<FeeManagementUiState>((set) => ({
  invoiceTableFilters: {},
  setInvoiceTableFilters: (filters) => set({ invoiceTableFilters: filters }),

  feeTypeTableFilters: {},
  setFeeTypeTableFilters: (filters) => set({ feeTypeTableFilters: filters }),

  paymentModalInvoiceId: null,
  openPaymentModal: (invoiceId) => set({ paymentModalInvoiceId: invoiceId }),
  closePaymentModal: () => set({ paymentModalInvoiceId: null }),

  generationStatusFeeTypeId: null,
  setGenerationStatusFeeTypeId: (id) => set({ generationStatusFeeTypeId: id }),
}))
