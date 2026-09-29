"use client"

import { useMemo } from "react"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"

export interface SettlementProgramOption {
  id: number
  name: string
}

/**
 * Major programs the caller may configure settlement for. Unscoped callers
 * (SUPER_ADMIN) get every active major program; a scoped bursary/admin gets
 * only their granted program(s). UI convenience only — the backend enforces
 * scope (403 OUT_OF_SCOPE).
 */
export function useSettlementPrograms() {
  const { isUnscoped, scopedPrograms } = useMajorProgramScope()
  const { data, isLoading, isError, refetch } = useMajorPrograms()

  const programs = useMemo<SettlementProgramOption[]>(() => {
    const active = (data?.data ?? []).filter((mp) => mp.isActive)
    if (isUnscoped) return active.map((mp) => ({ id: mp.id, name: mp.name }))
    // Scoped: prefer the live list's names, but never drop a granted program
    // just because the list failed to load.
    const byId = new Map(active.map((mp) => [mp.id, mp.name]))
    return scopedPrograms.map((mp) => ({
      id: mp.id,
      name: byId.get(mp.id) ?? mp.name,
    }))
  }, [data, isUnscoped, scopedPrograms])

  return {
    programs,
    isLoading: isUnscoped && isLoading,
    isError: isUnscoped && isError,
    refetch,
  }
}
