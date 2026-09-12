import { create } from "zustand"
import type { DocumentStatus } from "../types"

interface DocumentUiState {
  statusFilter: DocumentStatus | undefined
  setStatusFilter: (status: DocumentStatus | undefined) => void

  documentTypeFilter: string | undefined
  setDocumentTypeFilter: (type: string | undefined) => void

  page: number
  setPage: (page: number) => void
}

export const useDocumentUiStore = create<DocumentUiState>((set) => ({
  statusFilter: "pending",
  setStatusFilter: (status) => set({ statusFilter: status, page: 1 }),

  documentTypeFilter: undefined,
  setDocumentTypeFilter: (type) => set({ documentTypeFilter: type, page: 1 }),

  page: 1,
  setPage: (page) => set({ page }),
}))
