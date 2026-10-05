"use client"

import { create } from "zustand"
import type { ResetTarget } from "../types"

// UI-only state of the reset flow dialog: which target is open, which step it
// is on, and the run id being watched. Never server data (preview and run
// details live in React Query) and never the password (form state only).

export type ResetFlowStep = "preview" | "confirm" | "progress"

export type ResetFlow =
  | { step: "preview" | "confirm"; target: ResetTarget; runId: null }
  | { step: "progress"; target: ResetTarget | null; runId: string }

interface InstanceResetUiState {
  flow: ResetFlow | null
  /** Start a reset flow at the preview step. */
  openFlow: (target: ResetTarget) => void
  /** Watch a run (just started, in progress, or from history). */
  watchRun: (runId: string, target?: ResetTarget | null) => void
  goToStep: (step: "preview" | "confirm") => void
  closeFlow: () => void
}

export const useInstanceResetUiStore = create<InstanceResetUiState>()(
  (set) => ({
    flow: null,
    openFlow: (target) =>
      set({ flow: { step: "preview", target, runId: null } }),
    watchRun: (runId, target = null) =>
      set({ flow: { step: "progress", target, runId } }),
    goToStep: (step) =>
      set((s) =>
        s.flow?.target
          ? { flow: { step, target: s.flow.target, runId: null } }
          : s
      ),
    closeFlow: () => set({ flow: null }),
  })
)
