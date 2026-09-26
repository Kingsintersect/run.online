"use client"

import { useEffect, useMemo } from "react"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useSemesters } from "@/hooks/useSemesters"
import { useResultsUiStore } from "../store/results-ui.store"
import { useMajorProgramStructure } from "./use-major-program-structure"
import { useResultPullScope } from "./use-results"
import type { ResultScopeSelection } from "../types"

export interface ScopeOption {
  value: string
  label: string
}

// Admin/manager Results workspace, major program first: which major
// programs the caller can pick, the structure under the chosen one (only the
// levels it has), the cascaded options for each level, and what a Moodle
// pull would cover. Filter values themselves live in useResultsUiStore.
export function useResultsScope() {
  const w = useResultsUiStore((s) => s.workspace)
  const setWorkspace = useResultsUiStore((s) => s.setWorkspace)
  const { withinScope } = useMajorProgramScope()
  const { data: majorProgramsRes, isLoading: loadingMajorPrograms } =
    useMajorPrograms()

  const majorPrograms = useMemo(
    () =>
      (majorProgramsRes?.data ?? [])
        .filter((mp) => mp.isActive && withinScope(mp.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [majorProgramsRes, withinScope]
  )

  // Exactly one major program available (a scoped admin, or a
  // single-programme deployment): pick it. A remembered choice that is no
  // longer available is cleared.
  const onlyId = majorPrograms.length === 1 ? majorPrograms[0].id : null
  const listLoaded = majorProgramsRes != null
  const staleChoice =
    listLoaded &&
    w.majorProgramId != null &&
    !majorPrograms.some((mp) => mp.id === w.majorProgramId)
  useEffect(() => {
    if (staleChoice) setWorkspace({ majorProgramId: onlyId })
    else if (onlyId != null && w.majorProgramId == null)
      setWorkspace({ majorProgramId: onlyId })
  }, [onlyId, staleChoice, w.majorProgramId, setWorkspace])

  const structure = useMajorProgramStructure(w.majorProgramId)
  const { data: semesters = [] } = useSemesters(w.sessionId)

  const departments = useMemo(() => {
    if (w.facultyId == null) return structure.departments
    const ids = new Set(
      structure.programs
        .filter((p) => p.facultyId === w.facultyId)
        .map((p) => p.departmentId)
    )
    return structure.departments.filter((d) => ids.has(d.id))
  }, [structure, w.facultyId])

  const programs = useMemo(
    () =>
      structure.programs.filter(
        (p) =>
          (w.facultyId == null || p.facultyId === w.facultyId) &&
          (w.departmentId == null || p.departmentId === w.departmentId)
      ),
    [structure, w.facultyId, w.departmentId]
  )

  const majorProgram =
    majorPrograms.find((mp) => mp.id === w.majorProgramId) ?? null
  const department =
    structure.departments.find((d) => d.id === w.departmentId) ?? null
  const program =
    structure.programs.find((p) => p.program.id === w.programId)?.program ??
    null
  const semester = semesters.find((s) => s.id === w.semesterId) ?? null

  // What the list and a pull are actually narrowed by. /results/offerings has
  // no faculty filter, so a faculty on its own only narrows the department
  // and program pickers — it isn't part of the applied scope.
  const facultyOnly =
    w.facultyId != null && w.departmentId == null && w.programId == null
  const structureLabel = majorProgram
    ? [majorProgram.name, department?.name, program?.name]
        .filter(Boolean)
        .join(" › ")
    : null
  const scopeLabel =
    structureLabel && semester
      ? `${structureLabel} · ${semester.name}`
      : structureLabel

  const selection: ResultScopeSelection | null =
    w.majorProgramId != null && w.semesterId != null
      ? {
          semesterId: w.semesterId,
          majorProgramId: w.majorProgramId,
          departmentId: w.departmentId ?? undefined,
          programId: w.programId ?? undefined,
        }
      : null
  const pullScope = useResultPullScope(selection)
  const pullOfferingIds =
    pullScope.data?.available === true ? pullScope.data.data : null

  const toOptions = <T extends { id: number; name: string }>(
    items: T[]
  ): ScopeOption[] => items.map((i) => ({ value: String(i.id), label: i.name }))

  return {
    majorProgramOptions: toOptions(majorPrograms),
    loadingMajorPrograms,
    /** Hide the major-program picker's "choose" state when there's no choice. */
    singleMajorProgram: onlyId != null,
    structure,
    facultyOptions: toOptions(structure.faculties),
    departmentOptions: toOptions(departments),
    programOptions: programs.map((p) => ({
      value: String(p.program.id),
      label: p.program.name,
    })),
    facultyOnly,
    scopeLabel,
    pull: {
      selection,
      offeringIds: pullOfferingIds,
      isLoading: selection != null && pullScope.isLoading,
      isError: pullScope.isError,
      notAvailable: pullScope.data?.available === false,
    },
  }
}

export type ResultsScope = ReturnType<typeof useResultsScope>
