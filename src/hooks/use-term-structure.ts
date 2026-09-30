"use client"

import { useCallback, useMemo } from "react"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import type { MajorProgramTermStructure } from "@/types/school"

// B25 (2026-09-28): a major program runs either per semester ("SEMESTER",
// the server default) or per whole session ("SESSION", Certificate/
// Foundational-style, one auto-managed "Full Session" semester the server
// resolves itself). `MajorProgram.termStructure` is optional on the wire, so
// a missing key, an unknown major program, or an institution-wide session
// all read as "SEMESTER" and existing screens keep today's behaviour.

/** Resolver from a major program id and/or session id to its term structure. */
function useTermStructureResolver() {
  const { data: sessions } = useAcademicSessions()
  const { data: majorProgramsRes } = useMajorPrograms()

  const byMajorProgram = useMemo(() => {
    const map = new Map<number, MajorProgramTermStructure>()
    for (const mp of majorProgramsRes?.data ?? []) {
      map.set(mp.id, mp.termStructure ?? "SEMESTER")
    }
    return map
  }, [majorProgramsRes])

  return useCallback(
    (
      majorProgramId: number | null | undefined,
      sessionId: number | null | undefined
    ): MajorProgramTermStructure => {
      const ownerId =
        majorProgramId ??
        (sessionId != null
          ? sessions?.find((s) => s.id === sessionId)?.majorProgramId
          : null) ??
        null
      if (ownerId === null) return "SEMESTER"
      return byMajorProgram.get(ownerId) ?? "SEMESTER"
    },
    [sessions, byMajorProgram]
  )
}

/** For lists: returns `(sessionId) => termStructure`. */
export function useSessionTermStructure() {
  const resolve = useTermStructureResolver()
  return useCallback(
    (sessionId: number | null | undefined): MajorProgramTermStructure =>
      resolve(null, sessionId),
    [resolve]
  )
}

interface UseTermStructureParams {
  /** The major program being worked in, when the screen has one. */
  majorProgramId?: number | null
  /** Otherwise the chosen session's own major program decides. */
  sessionId?: number | null
}

export interface TermStructureInfo {
  termStructure: MajorProgramTermStructure
  /** True for a SESSION-structured program: no semester to pick. */
  sessionBased: boolean
}

/** For one screen's current scope. The major program wins over the session. */
export function useTermStructure({
  majorProgramId = null,
  sessionId = null,
}: UseTermStructureParams): TermStructureInfo {
  const termStructure = useTermStructureResolver()(majorProgramId, sessionId)
  return { termStructure, sessionBased: termStructure === "SESSION" }
}
