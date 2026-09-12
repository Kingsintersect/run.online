"use client"

import { create } from "zustand"

interface DemographicsUiState {
  selectedCountryId: number | null
  selectedStateId: number | null
  setSelectedCountry: (id: number | null) => void
  setSelectedState: (id: number | null) => void
}

/** UI-only drill-down state for the admin Country/State/LGA management screen — not server data. */
export const useDemographicsUiStore = create<DemographicsUiState>()((set) => ({
  selectedCountryId: null,
  selectedStateId: null,
  setSelectedCountry: (id) =>
    set({ selectedCountryId: id, selectedStateId: null }),
  setSelectedState: (id) => set({ selectedStateId: id }),
}))
