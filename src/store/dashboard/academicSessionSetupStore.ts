import { create } from "zustand"

export type AcademicSessionSetupStep = "sessions" | "semesters"

interface AcademicSessionSetupState {
  currentStep: AcademicSessionSetupStep
  setCurrentStep: (step: AcademicSessionSetupStep) => void

  selectedSessionId: number | null
  selectedSessionName: string | null
  setSelectedSession: (id: number, name: string) => void
  clearSelectedSession: () => void

  reset: () => void
}

export const useAcademicSessionSetupStore = create<AcademicSessionSetupState>()(
  (set) => ({
    currentStep: "sessions",
    setCurrentStep: (step) => set({ currentStep: step }),

    selectedSessionId: null,
    selectedSessionName: null,
    setSelectedSession: (id, name) =>
      set({ selectedSessionId: id, selectedSessionName: name }),
    clearSelectedSession: () =>
      set({
        selectedSessionId: null,
        selectedSessionName: null,
        currentStep: "sessions",
      }),

    reset: () =>
      set({
        currentStep: "sessions",
        selectedSessionId: null,
        selectedSessionName: null,
      }),
  })
)
