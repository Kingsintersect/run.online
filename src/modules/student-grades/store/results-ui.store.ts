import { create } from "zustand"
import type { ResultSheetFilters, RowFlag, SheetStatus } from "../types"

// Domain-scoped UI state for the Results workspace and sheet view — filters,
// paging and tabs only. Server data lives in the React Query cache.

export type SheetRowFilter = RowFlag | "ADJUSTED" | "FEES" | "ALL"
export type SheetTab = "scores" | "items" | "normalize" | "history"

interface WorkspaceFilters {
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
  sessionId: null,
  semesterId: null,
  programId: null,
  departmentId: null,
  status: null,
  flag: null,
  search: "",
  page: 1,
}

export const useResultsUiStore = create<ResultsUiState>((set) => ({
  workspace: { ...DEFAULT_WORKSPACE },
  // Any filter change other than paging sends the list back to page 1.
  setWorkspace: (patch) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        ...patch,
        ...("sessionId" in patch && patch.sessionId !== s.workspace.sessionId
          ? { semesterId: null }
          : {}),
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
