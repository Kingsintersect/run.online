import { create } from "zustand"
import type { DocumentStatus } from "../types"

interface DocumentUiState {
  statusFilter: DocumentStatus | undefined
  setStatusFilter: (status: DocumentStatus | undefined) => void

  documentTypeFilter: string | undefined
  setDocumentTypeFilter: (type: string | undefined) => void

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  majorProgramFilter: number | null
  setMajorProgramFilter: (id: number | null) => void

  page: number
  setPage: (page: number) => void
}

export const useDocumentUiStore = create<DocumentUiState>((set) => ({
  statusFilter: "pending",
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),

  documentTypeFilter: undefined,
  setDocumentTypeFilter: (type) => set({ documentTypeFilter: type, page: 1 }),

  majorProgramFilter: null,
  setMajorProgramFilter: (id) => set({ majorProgramFilter: id, page: 1 }),

  page: 1,
  setPage: (page) => set({ page }),
}))
