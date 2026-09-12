import type {
  DocumentQueryFilters,
  StudentDocumentQueryFilters,
} from "../types"

export const documentKeys = {
  all: ["documents"] as const,

  list: (filters?: DocumentQueryFilters) =>
    [...documentKeys.all, "list", filters] as const,

  detail: (id: number) => [...documentKeys.all, "detail", id] as const,

  byStudent: (studentId: number, filters?: StudentDocumentQueryFilters) =>
    [...documentKeys.all, "student", studentId, filters] as const,
} as const
