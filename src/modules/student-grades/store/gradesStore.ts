import { create } from "zustand"
import type { Grade } from "../types/grades.types"

interface GradesStoreState {
  // Grade detail modal
  selectedGrade: Grade | null
  gradeDetailOpen: boolean
  // Transcript modal
  transcriptStudentId: number | null
  transcriptOpen: boolean
}

interface GradesStoreActions {
  openGradeDetail: (grade: Grade) => void
  closeGradeDetail: () => void
  openTranscript: (studentId: number) => void
  closeTranscript: () => void
  updateGradeInStore: (updated: Grade) => void
}

export const useGradesStore = create<GradesStoreState & GradesStoreActions>(
  (set, get) => ({
    selectedGrade: null,
    gradeDetailOpen: false,
    transcriptStudentId: null,
    transcriptOpen: false,

    openGradeDetail: (grade) =>
      set({ selectedGrade: grade, gradeDetailOpen: true }),
    closeGradeDetail: () =>
      set({ gradeDetailOpen: false, selectedGrade: null }),

    openTranscript: (studentId) =>
      set({ transcriptStudentId: studentId, transcriptOpen: true }),
    closeTranscript: () =>
      set({ transcriptOpen: false, transcriptStudentId: null }),

    updateGradeInStore: (updated) => {
      const current = get().selectedGrade
      if (current?.id === updated.id) set({ selectedGrade: updated })
    },
  })
)
