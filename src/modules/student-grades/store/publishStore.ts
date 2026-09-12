import { create } from "zustand"
import type { Grade, PublishSelectionFilters } from "../types/grades.types"

interface PublishStoreState {
  // Cascading selection
  filters: PublishSelectionFilters
  // Loaded grades for the current selection
  loadedGrades: Grade[]
  gradesLoaded: boolean
  // Row selection (grade IDs)
  selectedIds: number[]
  // Confirmation modal
  confirmOpen: boolean
  // Publishing in-flight
  publishing: boolean
}

interface PublishStoreActions {
  setFilter: (patch: Partial<PublishSelectionFilters>) => void
  resetFilters: () => void
  setLoadedGrades: (grades: Grade[]) => void
  clearLoadedGrades: () => void
  toggleSelect: (id: number) => void
  selectAll: (ids: number[]) => void
  deselectAll: () => void
  openConfirm: () => void
  closeConfirm: () => void
  setPublishing: (v: boolean) => void
  applyPublished: () => void
}

const DEFAULT_FILTERS: PublishSelectionFilters = {
  academicYearId: null,
  semesterId: null,
  programId: null,
  courseId: null,
}

export const usePublishStore = create<PublishStoreState & PublishStoreActions>(
  (set, get) => ({
    filters: { ...DEFAULT_FILTERS },
    loadedGrades: [],
    gradesLoaded: false,
    selectedIds: [],
    confirmOpen: false,
    publishing: false,

    setFilter: (patch) => {
      const current = get().filters
      const next = { ...current, ...patch }

      // Cascade: if academic year changes, reset semester
      if (
        patch.academicYearId !== undefined &&
        patch.academicYearId !== current.academicYearId
      ) {
        next.semesterId = null
      }
      // If program changes, reset course
      if (
        patch.programId !== undefined &&
        patch.programId !== current.programId
      ) {
        next.courseId = null
      }

      set({
        filters: next,
        gradesLoaded: false,
        loadedGrades: [],
        selectedIds: [],
      })
    },

    resetFilters: () =>
      set({
        filters: { ...DEFAULT_FILTERS },
        loadedGrades: [],
        gradesLoaded: false,
        selectedIds: [],
      }),

    setLoadedGrades: (grades) =>
      set({ loadedGrades: grades, gradesLoaded: true, selectedIds: [] }),
    clearLoadedGrades: () =>
      set({ loadedGrades: [], gradesLoaded: false, selectedIds: [] }),

    toggleSelect: (id) => {
      const ids = get().selectedIds
      set({
        selectedIds: ids.includes(id)
          ? ids.filter((x) => x !== id)
          : [...ids, id],
      })
    },

    selectAll: (ids) => set({ selectedIds: ids }),
    deselectAll: () => set({ selectedIds: [] }),

    openConfirm: () => set({ confirmOpen: true }),
    closeConfirm: () => set({ confirmOpen: false }),

    setPublishing: (v) => set({ publishing: v }),

    // The real publish endpoint returns a count, not the updated grade
    // records — the caller re-fetches the current preview afterward to see
    // the new PUBLISHED statuses rather than patching them in locally here.
    applyPublished: () =>
      set({ selectedIds: [], publishing: false, confirmOpen: false }),
  })
)
