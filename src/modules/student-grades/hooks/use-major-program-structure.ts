"use client"

import { useMemo } from "react"
import { useAcademicUnits, useUnitTypes } from "@/hooks/useAcademicStructure"
import { useAllPrograms } from "@/hooks/useCourseStructure"
import type { AcademicUnit, Program } from "@/types/school"

export interface StructureProgram {
  program: Program
  /** Nearest department above the program, if its tree has one. */
  departmentId: number | null
}

export interface StructureLevelOption {
  id: number
  name: string
  /** Department the unit stands for, when it is one (for server filtering). */
  departmentId: number | null
}

/** One picker between the major program and its programs. */
export interface StructureLevel {
  /** Position in the chosen path (0 = directly under the major program). */
  depth: number
  /** The tree's own name for this level, e.g. "Faculty", "Department". */
  label: string
  options: StructureLevelOption[]
  selectedId: number | null
}

export interface MajorProgramStructure {
  /** Only the levels this major program's tree actually has, top-down. */
  levels: StructureLevel[]
  /** Programs under the deepest chosen level (all of them when none is). */
  programs: StructureProgram[]
  /** Department on the chosen path, if any (sent as the list's departmentId). */
  departmentId: number | null
  isLoading: boolean
}

const PROGRAM = "PROGRAM"

function titleCase(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * The structure under one major program, read from the academic-unit tree
 * (Academic Structure), so the pickers follow whatever shape the registry
 * built: MP → Faculty → Department → Program, MP → Program, MP → Stream →
 * Program, and so on. Every level between the major program and its programs
 * becomes one picker, labelled with the tree's unit type; a level only
 * appears when that part of the tree has one. Levels below a program (Level,
 * Semester) are not part of this cascade.
 *
 * Programs that belong to the major program (`majorProgramId`) but aren't
 * placed in the tree yet are still listed while no level is chosen, so an
 * incomplete tree never hides a program.
 */
export function useMajorProgramStructure(
  majorProgramId: number | null,
  unitPath: number[]
): MajorProgramStructure {
  const programsQ = useAllPrograms()
  const unitsQ = useAcademicUnits()
  const typesQ = useUnitTypes()

  return useMemo(() => {
    const isLoading = programsQ.isLoading || unitsQ.isLoading
    const empty: MajorProgramStructure = {
      levels: [],
      programs: [],
      departmentId: null,
      isLoading,
    }
    if (majorProgramId == null) return empty

    const units = (unitsQ.data?.data ?? []).filter((u) => u.isActive)
    const unitsById = new Map(units.map((u) => [u.id, u]))
    const children = new Map<number, AcademicUnit[]>()
    for (const u of units) {
      if (u.parentId == null) continue
      const list = children.get(u.parentId) ?? []
      list.push(u)
      children.set(u.parentId, list)
    }
    const typeLabel = new Map(
      (typesQ.data?.data ?? []).map((t) => [t.id, t.label])
    )
    const labelOf = (u: AcademicUnit) =>
      typeLabel.get(u.typeId) ?? titleCase(u.typeCode)

    // Program units anywhere below a node.
    const programUnitsCache = new Map<number, AcademicUnit[]>()
    const programUnitsUnder = (id: number): AcademicUnit[] => {
      const cached = programUnitsCache.get(id)
      if (cached) return cached
      const out: AcademicUnit[] = []
      for (const c of children.get(id) ?? []) {
        if (c.typeCode === PROGRAM) out.push(c)
        else out.push(...programUnitsUnder(c.id))
      }
      programUnitsCache.set(id, out)
      return out
    }
    const departmentIdOf = (u: AcademicUnit): number | null =>
      u.linkedEntity?.type === "department" ? u.linkedEntity.id : null

    const allPrograms = (programsQ.data?.data ?? []).filter(
      (p) => p.isActive && p.majorProgramId === majorProgramId
    )
    const programsById = new Map(allPrograms.map((p) => [p.id, p]))

    const root = units.find(
      (u) =>
        u.linkedEntity?.type === "major_program" &&
        u.linkedEntity.id === majorProgramId
    )

    // Walk the chosen path, adding a picker wherever the tree branches into
    // non-program units that lead to programs.
    const levels: StructureLevel[] = []
    let node = root ?? null
    let departmentId: number | null = null
    for (let depth = 0; node && depth < 12; depth++) {
      const containers = (children.get(node.id) ?? [])
        .filter(
          (c) => c.typeCode !== PROGRAM && programUnitsUnder(c.id).length > 0
        )
        .sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
        )
      if (containers.length === 0) break
      // Mixed unit types at one depth are labelled generically.
      const labels = new Set(containers.map(labelOf))
      const label = labels.size === 1 ? [...labels][0] : "Unit"
      const chosen = containers.find((c) => c.id === unitPath[depth]) ?? null
      levels.push({
        depth,
        label,
        options: containers.map((c) => ({
          id: c.id,
          name: c.name,
          departmentId: departmentIdOf(c),
        })),
        selectedId: chosen?.id ?? null,
      })
      if (!chosen) break
      departmentId = departmentIdOf(chosen) ?? departmentId
      node = chosen
    }

    // Programs under the deepest chosen unit (the major program itself when
    // none is chosen), via each program unit's link. The walk above leaves
    // `node` on that unit.
    const scopeNode = node
    const seen = new Set<number>()
    const programs: StructureProgram[] = []
    const addProgram = (program: Program, deptId: number | null) => {
      if (seen.has(program.id)) return
      seen.add(program.id)
      programs.push({
        program,
        departmentId: deptId ?? program.departmentId ?? null,
      })
    }
    for (const pu of scopeNode ? programUnitsUnder(scopeNode.id) : []) {
      if (pu.linkedEntity?.type !== "program") continue
      const program = programsById.get(pu.linkedEntity.id)
      if (!program) continue
      // Nearest department above this program unit.
      let dept: number | null = null
      let up = pu.parentId != null ? unitsById.get(pu.parentId) : undefined
      for (let g = 0; up && g < 20 && dept == null; g++) {
        dept = departmentIdOf(up)
        up = up.parentId != null ? unitsById.get(up.parentId) : undefined
      }
      addProgram(program, dept)
    }
    // Not yet placed in the tree: listed only while no level is chosen.
    if (levels.every((l) => l.selectedId == null))
      for (const p of allPrograms) addProgram(p, null)
    programs.sort((a, b) => a.program.name.localeCompare(b.program.name))

    return { levels, programs, departmentId, isLoading }
  }, [
    majorProgramId,
    unitPath,
    programsQ.data,
    programsQ.isLoading,
    unitsQ.data,
    unitsQ.isLoading,
    typesQ.data,
  ])
}
