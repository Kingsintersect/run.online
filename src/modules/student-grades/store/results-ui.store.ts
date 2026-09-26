import { create } from "zustand"
import type { ResultSheetFilters, RowFlag, SheetStatus } from "../types"

// Domain-scoped UI state for the Results workspace and sheet view — filters,
// paging and tabs only. Server data lives in the React Query cache.

export type SheetRowFilter = RowFlag | "ADJUSTED" | "FEES" | "ALL"
export type SheetTab = "scores" | "items" | "normalize" | "history"

interface WorkspaceFilters {
  /** Admin/manager workspace: the first filter; everything cascades from it. */
  majorProgramId: number | null
  /** Structure levels under the major program (only those that exist). */
  facultyId: number | null
  sessionId: number | null
  semesterId: number | null
  programId: number | null
  departmentId: number | null
  status: SheetStatus | null
  flag: ResultSheetFilters["flag"] | null
  search: string
  page: number
}

interface ResultsUiState {
  workspace: WorkspaceFilters
  setWorkspace: (patch: Partial<WorkspaceFilters>) => void
  resetWorkspace: () => void

  sheetTab: SheetTab
  setSheetTab: (tab: SheetTab) => void
  rowFilter: SheetRowFilter
  rowSearch: string
  rowPage: number
  setRowFilter: (f: SheetRowFilter) => void
  setRowSearch: (s: string) => void
  setRowPage: (p: number) => void
  resetSheetView: () => void
}

const DEFAULT_WORKSPACE: WorkspaceFilters = {
  majorProgramId: null,
  facultyId: null,
  sessionId: null,
  semesterId: null,
  programId: null,
  departmentId: null,
  status: null,
  flag: null,
  search: "",
  page: 1,
}

// Cascade: changing a level clears every level below it —
// major program → faculty → department → program, and major program →
// session → semester (sessions belong to a major program).
function cascade(
  prev: WorkspaceFilters,
  patch: Partial<WorkspaceFilters>
): Partial<WorkspaceFilters> {
  const changed = <K extends keyof WorkspaceFilters>(k: K) =>
    k in patch && patch[k] !== prev[k]
  if (changed("majorProgramId"))
    return {
      facultyId: null,
      departmentId: null,
      programId: null,
      sessionId: null,
      semesterId: null,
    }
  const reset: Partial<WorkspaceFilters> = {}
  if (changed("facultyId")) {
    reset.departmentId = null
    reset.programId = null
  }
  if (changed("departmentId")) reset.programId = null
  if (changed("sessionId")) reset.semesterId = null
  return reset
}

export const useResultsUiStore = create<ResultsUiState>((set) => ({
  workspace: { ...DEFAULT_WORKSPACE },
  // Any filter change other than paging sends the list back to page 1.
  // Explicit values in `patch` win over the cascade's resets.
  setWorkspace: (patch) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        ...cascade(s.workspace, patch),
        ...patch,
        page: patch.page ?? 1,
      },
    })),
  resetWorkspace: () => set({ workspace: { ...DEFAULT_WORKSPACE } }),

  sheetTab: "scores",
  setSheetTab: (sheetTab) => set({ sheetTab }),
  rowFilter: "ALL",
  rowSearch: "",
  rowPage: 1,
  setRowFilter: (rowFilter) => set({ rowFilter, rowPage: 1 }),
  setRowSearch: (rowSearch) => set({ rowSearch, rowPage: 1 }),
  setRowPage: (rowPage) => set({ rowPage }),
  resetSheetView: () =>
    set({ sheetTab: "scores", rowFilter: "ALL", rowSearch: "", rowPage: 1 }),
}))
