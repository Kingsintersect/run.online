"use client"

import { create } from "zustand"
import type { AssessmentType } from "../types"

// ── Assessments browsing UI store — UI-only state (filters, pagination) ───
// Server-state (the actual assessment data) lives in React Query. Distinct
// from moodle-sync-ui.store.ts, which is scoped to the raw admin sync
// dashboard (push/pull tab state) rather than this consumer-facing
// browse/filter experience (student "my assessments", tutor/admin lists).

interface AssessmentsUiState {
  activeType: AssessmentType | null
  searchQuery: string
  page: number
  limit: number

  visibilityFilter: "all" | "visible" | "hidden"

  upcomingOnly: boolean

  setActiveType: (type: AssessmentType | null) => void
  setSearchQuery: (query: string) => void
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setVisibilityFilter: (v: "all" | "visible" | "hidden") => void
  setUpcomingOnly: (v: boolean) => void
  resetFilters: () => void
}

const initialState = {
  activeType: null,
  searchQuery: "",
  page: 1,
  limit: 20,
  visibilityFilter: "all" as const,
  upcomingOnly: false,
}

export const useAssessmentsUiStore = create<AssessmentsUiState>()((set) => ({
  ...initialState,

  setActiveType: (type) => set({ activeType: type, page: 1 }),
  setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setVisibilityFilter: (visibilityFilter) => set({ visibilityFilter, page: 1 }),
  setUpcomingOnly: (upcomingOnly) => set({ upcomingOnly, page: 1 }),
  resetFilters: () => set(initialState),
}))
