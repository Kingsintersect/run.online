"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { directorService } from "../services/director.service"

export const directorGradeReportKeys = {
  all: ["director", "grade-report"] as const,
  report: (semesterId: number | null, majorProgramId: number | null) =>
    [...directorGradeReportKeys.all, semesterId, majorProgramId] as const,
}

// Real endpoint per bruno/director/Grade Reports - Summary.bru accepts only
// an optional `semesterId` — the shared DirectorFilter store (facultyName/
// departmentName/programName/level/status/search, used by the Financial and
// Statistical tabs) doesn't apply here, and none of its fields resolve to a
// real semester id anyway (DirectorFilterBar only collects a "First"/
// "Second" display label, not a session-scoped id). This hook manages its
// own local semesterId instead of reading the shared filter store. See
// sandbox/TRIPLE_AUDIT_2026-09-13.md §1a.
export function useDirectorGrades() {
  const [semesterId, setSemesterId] = useState<number | null>(null)
  const [majorProgramId, setMajorProgramId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: directorGradeReportKeys.report(semesterId, majorProgramId),
    queryFn: () =>
      directorService.fetchGradeReport(
        semesterId ?? undefined,
        majorProgramId ?? undefined
      ),
  })

  const refetch = () => {
    void queryClient.invalidateQueries({
      queryKey: directorGradeReportKeys.all,
    })
  }

  return {
    gradeReport: query.data ?? null,
    semesterId,
    setSemesterId,
    majorProgramId,
    setMajorProgramId,
    isLoading: query.isLoading,
    error: query.isError ? "Failed to load grade report" : null,
    refetch,
  }
}
