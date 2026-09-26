"use client"

import { useMemo } from "react"
import { useAcademicUnits } from "@/hooks/useAcademicStructure"
import {
  useAllDepartments,
  useAllPrograms,
  useFaculties,
} from "@/hooks/useCourseStructure"
import type { AcademicUnit, Department, Faculty, Program } from "@/types/school"

export interface StructureProgram {
  program: Program
  facultyId: number | null
  departmentId: number | null
}

export interface MajorProgramStructure {
  /** Levels that exist for this major program, top-down. */
  faculties: Faculty[]
  departments: Department[]
  programs: StructureProgram[]
  hasFaculties: boolean
  hasDepartments: boolean
  isLoading: boolean
}

// Walk a program's AcademicUnit ancestry (parentAcademicUnitId → parentId …)
// and return the first department and faculty found on the way up. Covers
// programs attached straight to a faculty or a major program, which have no
// departmentId of their own.
function ancestry(
  startUnitId: number | null,
  unitsById: Map<number, AcademicUnit>
): { facultyId: number | null; departmentId: number | null } {
  let facultyId: number | null = null
  let departmentId: number | null = null
  let unit = startUnitId != null ? unitsById.get(startUnitId) : undefined
  for (let guard = 0; unit && guard < 20; guard++) {
    const linked = unit.linkedEntity
    if (linked?.type === "department" && departmentId == null)
      departmentId = linked.id
    if (linked?.type === "faculty" && facultyId == null) facultyId = linked.id
    if (linked?.type === "major_program") break
    unit = unit.parentId != null ? unitsById.get(unit.parentId) : undefined
  }
  return { facultyId, departmentId }
}

/**
 * The real shape under one major program — only the levels it actually
 * uses. Programs belong by `majorProgramId`; each program's department and
 * faculty come from `departmentId → Department.facultyId`, or failing that
 * its place in the academic-unit tree. Faculties/departments no program of
 * this major program sits under are left out, so e.g. Foundational
 * Programmes (programs attached directly to it) shows Program only.
 */
export function useMajorProgramStructure(
  majorProgramId: number | null
): MajorProgramStructure {
  const programsQ = useAllPrograms()
  const departmentsQ = useAllDepartments()
  const facultiesQ = useFaculties()
  const unitsQ = useAcademicUnits()

  return useMemo(() => {
    const isLoading =
      programsQ.isLoading ||
      departmentsQ.isLoading ||
      facultiesQ.isLoading ||
      unitsQ.isLoading
    const empty: MajorProgramStructure = {
      faculties: [],
      departments: [],
      programs: [],
      hasFaculties: false,
      hasDepartments: false,
      isLoading,
    }
    if (majorProgramId == null) return empty

    const departmentsById = new Map(
      (departmentsQ.data?.data ?? []).map((d) => [d.id, d])
    )
    const facultiesById = new Map(
      (facultiesQ.data?.data ?? []).map((f) => [f.id, f])
    )
    const unitsById = new Map((unitsQ.data?.data ?? []).map((u) => [u.id, u]))

    const programs: StructureProgram[] = (programsQ.data?.data ?? [])
      .filter((p) => p.isActive && p.majorProgramId === majorProgramId)
      .map((program) => {
        const viaTree = ancestry(program.parentAcademicUnitId, unitsById)
        const departmentId = program.departmentId ?? viaTree.departmentId
        const department =
          departmentId != null ? departmentsById.get(departmentId) : undefined
        const facultyId = department?.facultyId ?? viaTree.facultyId
        return {
          program,
          departmentId: department ? department.id : null,
          facultyId:
            facultyId != null && facultiesById.has(facultyId)
              ? facultyId
              : null,
        }
      })
      .sort((a, b) => a.program.name.localeCompare(b.program.name))

    const facultyIds = new Set(
      programs.map((p) => p.facultyId).filter((id) => id != null)
    )
    const departmentIds = new Set(
      programs.map((p) => p.departmentId).filter((id) => id != null)
    )
    const faculties = [...facultiesById.values()]
      .filter((f) => facultyIds.has(f.id))
      .sort((a, b) => a.name.localeCompare(b.name))
    const departments = [...departmentsById.values()]
      .filter((d) => departmentIds.has(d.id))
      .sort((a, b) => a.name.localeCompare(b.name))

    return {
      faculties,
      departments,
      programs,
      hasFaculties: faculties.length > 0,
      hasDepartments: departments.length > 0,
      isLoading,
    }
  }, [
    majorProgramId,
    programsQ.data,
    programsQ.isLoading,
    departmentsQ.data,
    departmentsQ.isLoading,
    facultiesQ.data,
    facultiesQ.isLoading,
    unitsQ.data,
    unitsQ.isLoading,
  ])
}
