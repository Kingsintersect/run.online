"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useDirectorStore } from "../store/director.store"
import { directorService } from "../services/director.service"
import type { DirectorFilter } from "../types/director.types"

export const directorGradeReportKeys = {
  all: ["director", "grade-report"] as const,
  report: (filter: DirectorFilter) =>
    [...directorGradeReportKeys.all, filter] as const,
}

// Real (pending) endpoint — see sandbox/result/missing_grade_apis.readme.md §8.
// Filter state stays in the shared Zustand store (also used by the
// Financial/Statistical tabs); the report data itself is React Query-owned
// so it caches, dedupes, and refetches automatically when `filter` changes.
export function useDirectorGrades() {
  const { filter, setFilter, resetFilter } = useDirectorStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: directorGradeReportKeys.report(filter),
    queryFn: () => directorService.fetchGradeReport(filter),
  })

  const refetch = (nextFilter?: DirectorFilter) => {
    if (nextFilter) {
      setFilter(nextFilter)
    } else {
      void queryClient.invalidateQueries({
        queryKey: directorGradeReportKeys.all,
      })
    }
  }

  return {
    gradeReport: query.data ?? null,
    filter,
    isLoading: query.isLoading,
    error: query.isError ? "Failed to load grade report" : null,
    setFilter,
    resetFilter,
    refetch,
  }
}
