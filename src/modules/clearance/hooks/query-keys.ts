import type { ClearanceQueryFilters } from "../types"

export const clearanceKeys = {
  all: ["clearance"] as const,

  types: () => [...clearanceKeys.all, "types"] as const,

  list: (filters?: ClearanceQueryFilters) =>
    [...clearanceKeys.all, "list", filters ?? {}] as const,
  detail: (id: number) => [...clearanceKeys.all, "detail", id] as const,
  byStudent: (studentId: number) =>
    [...clearanceKeys.all, "by-student", studentId] as const,
  summary: (studentId: number) =>
    [...clearanceKeys.all, "summary", studentId] as const,
} as const
