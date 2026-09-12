"use client"

import { create } from "zustand"
import type { EnrollmentStatus } from "../types"

// UI-only state (filters, dialogs) — server data lives in React Query.
interface EnrollmentUiState {
  semesterId: number | null
  offeringId: number | null
  statusFilter: EnrollmentStatus | "all"
  search: string

  enrollDialogOpen: boolean
  bulkEnrollDialogOpen: boolean

  setSemesterId: (id: number | null) => void
  setOfferingId: (id: number | null) => void
  setStatusFilter: (status: EnrollmentStatus | "all") => void
  setSearch: (search: string) => void
  openEnrollDialog: () => void
  openBulkEnrollDialog: () => void
  closeDialogs: () => void
  resetFilters: () => void
}

const initialState = {
  semesterId: null,
  offeringId: null,
  statusFilter: "all" as const,
  search: "",
  enrollDialogOpen: false,
  bulkEnrollDialogOpen: false,
}

export const useEnrollmentUiStore = create<EnrollmentUiState>()((set) => ({
  ...initialState,

  setSemesterId: (semesterId) => set({ semesterId }),
  setOfferingId: (offeringId) => set({ offeringId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearch: (search) => set({ search }),
  openEnrollDialog: () => set({ enrollDialogOpen: true }),
  openBulkEnrollDialog: () => set({ bulkEnrollDialogOpen: true }),
  closeDialogs: () =>
    set({ enrollDialogOpen: false, bulkEnrollDialogOpen: false }),
  resetFilters: () =>
    set({
      semesterId: null,
      offeringId: null,
      statusFilter: "all",
      search: "",
    }),
}))
