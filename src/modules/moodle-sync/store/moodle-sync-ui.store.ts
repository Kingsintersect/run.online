import { create } from "zustand"

type MoodleSyncTab =
  | "categories"
  | "users"
  | "courses"
  | "enrollments"
  | "assessments"
  | "grades"
  | "calendar"

interface MoodleSyncUiState {
  activeTab: MoodleSyncTab
  setActiveTab: (tab: MoodleSyncTab) => void

  expandedCategoryIds: Set<number>
  toggleCategoryExpanded: (id: number) => void

  userTableFilters: { role?: string; status?: string }
  setUserTableFilters: (filters: { role?: string; status?: string }) => void

  enrollmentTableFilters: { status?: string }
  setEnrollmentTableFilters: (filters: { status?: string }) => void

  selectedUserIds: number[]
  toggleUserSelected: (id: number) => void
  clearSelectedUsers: () => void

  selectedCourseOfferingIds: number[]
  toggleCourseSelected: (id: number) => void
  clearSelectedCourses: () => void
}

export const useMoodleSyncUiStore = create<MoodleSyncUiState>((set) => ({
  activeTab: "categories",
  setActiveTab: (tab) => set({ activeTab: tab }),

  expandedCategoryIds: new Set(),
  toggleCategoryExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedCategoryIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { expandedCategoryIds: next }
    }),

  userTableFilters: {},
  setUserTableFilters: (filters) => set({ userTableFilters: filters }),

  enrollmentTableFilters: {},
  setEnrollmentTableFilters: (filters) =>
    set({ enrollmentTableFilters: filters }),

  selectedUserIds: [],
  toggleUserSelected: (id) =>
    set((state) => ({
      selectedUserIds: state.selectedUserIds.includes(id)
        ? state.selectedUserIds.filter((x) => x !== id)
        : [...state.selectedUserIds, id],
    })),
  clearSelectedUsers: () => set({ selectedUserIds: [] }),

  selectedCourseOfferingIds: [],
  toggleCourseSelected: (id) =>
    set((state) => ({
      selectedCourseOfferingIds: state.selectedCourseOfferingIds.includes(id)
        ? state.selectedCourseOfferingIds.filter((x) => x !== id)
        : [...state.selectedCourseOfferingIds, id],
    })),
  clearSelectedCourses: () => set({ selectedCourseOfferingIds: [] }),
}))
