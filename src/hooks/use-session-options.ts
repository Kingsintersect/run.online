"use client"

import { useCallback, useMemo } from "react"
import { useAcademicSessions } from "@/hooks/useAcademicSessions"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMajorProgramScope } from "@/hooks/use-major-program-scope"
import {
  buildSessionOptions,
  formatSessionLabel,
  groupSessionOptions,
} from "@/lib/academic/session-label"

interface UseSessionOptionsParams {
  /**
   * Hide sessions outside the caller's major-program scope (institution-wide
   * sessions always stay visible). UI convenience only — the backend remains
   * the authorization boundary. Default `true`.
   */
  respectScope?: boolean
  /** Only sessions for this major program (plus institution-wide ones). */
  majorProgramId?: number | null
}

/**
 * One source for every academic-session picker: sessions labelled with their
 * major program ("2026/2027 — Part-Time Programmes"), so identically named
 * sessions from different programmes are distinguishable.
 */
export function useSessionOptions({
  respectScope = true,
  majorProgramId = null,
}: UseSessionOptionsParams = {}) {
  const { data: allSessions, isLoading: loadingSessions } =
    useAcademicSessions()
  const { data: majorProgramsRes, isLoading: loadingPrograms } =
    useMajorPrograms()
  const { withinScope } = useMajorProgramScope()
  const majorPrograms = majorProgramsRes?.data

  const sessions = useMemo(
    () =>
      (allSessions ?? []).filter((s) => {
        const mp = s.majorProgramId ?? null
        if (mp === null) return true
        if (majorProgramId != null && mp !== majorProgramId) return false
        return !respectScope || withinScope(mp)
      }),
    [allSessions, majorProgramId, respectScope, withinScope]
  )

  const options = useMemo(
    () => buildSessionOptions(sessions, majorPrograms),
    [sessions, majorPrograms]
  )
  const groups = useMemo(
    () => groupSessionOptions(sessions, majorPrograms),
    [sessions, majorPrograms]
  )

  /** Labelled name for any session id (searches the unfiltered list). */
  const labelFor = useCallback(
    (id: number | null | undefined): string | null => {
      if (id == null) return null
      const s = allSessions?.find((x) => x.id === id)
      return s ? formatSessionLabel(s, majorPrograms) : null
    },
    [allSessions, majorPrograms]
  )

  return {
    sessions,
    options,
    groups,
    labelFor,
    isLoading: loadingSessions || loadingPrograms,
  }
}
