"use client"

import { useMemo, useState } from "react"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"

/**
 * The major program an admin is working in on the progression screens.
 * Offers only programs within the caller's scope (UI convenience — the
 * backend enforces scope). With exactly one program on offer it is selected
 * automatically; otherwise the admin picks one.
 */
export function useProgressionMajorProgram() {
  const { withinScope } = useMajorProgramScope()
  const { data, isLoading, isError } = useMajorPrograms()
  const [picked, setPicked] = useState<number | null>(null)

  const programs = useMemo(
    () =>
      (data?.data ?? [])
        .filter((m) => withinScope(m.id))
        .map((m) => ({ id: m.id, name: m.name })),
    [data, withinScope]
  )

  const majorProgramId =
    picked != null && programs.some((p) => p.id === picked)
      ? picked
      : programs.length === 1
        ? programs[0].id
        : null

  return {
    programs,
    majorProgramId,
    setMajorProgramId: setPicked,
    majorProgramName:
      programs.find((p) => p.id === majorProgramId)?.name ?? null,
    isLoading,
    isError,
  }
}
