"use client"

import { useCallback, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { feeManagementQueryOptions } from "@/services/feeManagementApi"
import type { FeeTypeResponse } from "../types"

export interface FeeTypeScopeLabels {
  session: string | null
  majorProgram: string | null
  program: string | null
  level: string | null
}

/**
 * Human labels for a fee type's scope. The live fee-type response
 * (GET /fees/types, probed 2026-10-05) carries only the ids — sessionId,
 * majorProgramId, programId, levelId — not the `session`/`program`/`level`/
 * `majorProgram` objects this module originally expected, so a scoped fee
 * used to render as "All students". Embedded objects still win when a
 * backend sends them; otherwise the names come from the reference lists,
 * falling back to "#id" while those load.
 */
export function useFeeTypeScopeLabels() {
  const { data: majorProgramsRes } = useMajorPrograms()
  const { data: programsRes } = useQuery({
    ...courseStructureQueryOptions.programs.list(),
    staleTime: 1000 * 60 * 30,
  })
  const { data: levelsRes } = useQuery({
    ...courseStructureQueryOptions.levels.list(),
    staleTime: 1000 * 60 * 30,
  })
  const { data: sessions } = useQuery({
    ...feeManagementQueryOptions.sessions(),
    staleTime: 1000 * 60 * 30,
  })

  const names = useMemo(
    () => ({
      majorProgram: new Map(
        (majorProgramsRes?.data ?? []).map((m) => [m.id, m.name])
      ),
      program: new Map((programsRes?.data ?? []).map((p) => [p.id, p.name])),
      level: new Map((levelsRes?.data ?? []).map((l) => [l.id, l.name])),
      session: new Map((sessions ?? []).map((s) => [s.id, s.name])),
    }),
    [majorProgramsRes, programsRes, levelsRes, sessions]
  )

  return useCallback(
    (ft: FeeTypeResponse): FeeTypeScopeLabels => {
      const label = (
        embedded: { name: string } | null | undefined,
        id: number | null | undefined,
        lookup: Map<number, string>
      ) => embedded?.name ?? (id == null ? null : (lookup.get(id) ?? `#${id}`))
      return {
        session: label(ft.session, ft.sessionId, names.session),
        majorProgram: label(
          ft.majorProgram,
          ft.majorProgramId,
          names.majorProgram
        ),
        program: label(ft.program, ft.programId, names.program),
        level: label(ft.level, ft.levelId, names.level),
      }
    },
    [names]
  )
}
