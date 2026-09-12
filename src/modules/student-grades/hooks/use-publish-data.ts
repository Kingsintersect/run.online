"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import type { PublishSelectionFilters } from "../types/grades.types"
import {
  ACADEMIC_YEARS,
  SEMESTERS,
  PROGRAMS,
  gradesService,
} from "../services/grades.service"
import { usePublishStore } from "../store/publishStore"
import { gradesKeys } from "./query-keys"

// ─── Re-export reference data for use in wizard ───────────────────────────────

export { ACADEMIC_YEARS, SEMESTERS, PROGRAMS }

// ─── Courses filtered by program ─────────────────────────────────────────────

export function useCourseOptions(programId: string | null) {
  const query = useQuery({
    queryKey: gradesKeys.coursesByProgram(programId),
    queryFn: () => gradesService.getCoursesByProgram(programId as string),
    enabled: programId !== null,
  })

  return { courses: query.data ?? [], loading: query.isLoading }
}

// ─── Load grades for publish preview ─────────────────────────────────────────
// User-triggered (the wizard's "Load" step), not tied to automatic refetch on
// filter change — modeled as a mutation whose result is written into the
// publish store rather than a query.

export function usePublishPreview() {
  const { filters, setLoadedGrades, clearLoadedGrades } = usePublishStore()

  const isComplete =
    filters.academicYearId !== null &&
    filters.semesterId !== null &&
    filters.programId !== null &&
    filters.courseId !== null

  const mutation = useMutation({
    mutationFn: (f: PublishSelectionFilters) =>
      gradesService.getGradesForPublish(f),
    onSuccess: (grades) => setLoadedGrades(grades),
    onError: () => clearLoadedGrades(),
  })

  return {
    isComplete,
    loading: mutation.isPending,
    error: mutation.isError ? "Failed to load results. Try again." : null,
    load: (f: PublishSelectionFilters) => mutation.mutate(f),
  }
}

// ─── Publish action ───────────────────────────────────────────────────────────
// The real endpoint (POST /results/grades/publish/:semesterId) publishes every
// APPROVED grade in the semester in one shot — there is no per-grade-id
// publish. `semesterId` is a real numeric AcademicSession/Semester id; the
// row-selection UI upstream is now purely a preview aid, not a publish scope.

export function usePublishAction() {
  const { setPublishing, applyPublished, publishing } = usePublishStore()

  const mutation = useMutation({
    mutationFn: (semesterId: number) => {
      setPublishing(true)
      return gradesService.publishSemester(semesterId)
    },
    onSuccess: () => applyPublished(),
    onError: () => setPublishing(false),
  })

  return {
    publish: (semesterId: number) => mutation.mutateAsync(semesterId),
    publishing,
  }
}

// Manual CGPA recalculation (POST /results/cgpa/calculate/:studentId/:semesterId,
// never auto-triggered by the backend) lives in use-grades-mutations.ts as
// `useCalculateCgpa` — re-exported from there, not duplicated here.
export { useCalculateCgpa as useRecalculateCgpa } from "./use-grades-mutations"
