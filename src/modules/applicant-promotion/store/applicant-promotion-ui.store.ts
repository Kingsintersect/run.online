"use client"

import { create } from "zustand"

// UI-only capability flag: once the promote route answers "route not found"
// (404) or 405, the action stays disabled for the rest of this browser
// session instead of letting an admin re-hit a route that isn't there. It is
// not server data — it's what the UI learned about this deployment — so it
// lives here rather than in the React Query cache.
interface ApplicantPromotionUiState {
  endpointMissing: boolean
  markEndpointMissing: () => void
}

export const useApplicantPromotionUiStore = create<ApplicantPromotionUiState>(
  (set) => ({
    endpointMissing: false,
    markEndpointMissing: () => set({ endpointMissing: true }),
  })
)
