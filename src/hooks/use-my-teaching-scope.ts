"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useMajorPrograms } from "@/hooks/useCourseStructure"
import {
  teachingScopeApi,
  teachingScopeKeys,
} from "@/services/teachingScopeApi"

export type TeachingScopeReason = "teaches" | "heads"

export interface TeachingScopeProgram {
  id: number
  name: string
  reasons: TeachingScopeReason[]
}

export interface TeachingScopeMajorProgram {
  id: number
  name: string
  reasons: TeachingScopeReason[]
  programs: TeachingScopeProgram[]
}

export interface MyTeachingScope {
  /** Only the major programs (and their programs) this user teaches in or heads. */
  majorPrograms: TeachingScopeMajorProgram[]
  isLoading: boolean
  /** Loaded, and the user has nothing in scope. */
  isEmpty: boolean
  /**
   * Loaded and empty, but only because GET /me/teaching-scope is missing
   * (404/405) or failed — not a real "nothing assigned to you". Screens must not blame
   * admin setup in this case (see teachingScopeUnavailableMessage).
   */
  isUnavailable: boolean
  /** The scope request itself failed (not just missing) — worth a retry. */
  isFailed: boolean
  retry: () => void
  /** The program ids in a major program, for filtering a list client-side. */
  programIdsIn: (majorProgramId: number) => number[]
}

/**
 * Where the logged-in tutor, HOD or dean may look: the major programs and
 * programs they **teach in** or **head**, and nothing else. A lecturer can
 * teach across major programs (B.Sc, postgraduate, business school…), so the
 * tutor-side screens offer a selector built from this rather than one fixed
 * major program (sandbox/cross-program-teaching).
 *
 * Source of truth: GET /me/teaching-scope (bruno/user/Me - Teaching Scope.bru,
 * documented in both the QHUB and RUN collections, live since 2026-09-27).
 * Its answer is used as-is, even when empty (for example an HOD not yet
 * recorded as any department's head sees nothing).
 *
 * The earlier client-side derivation (offerings → one curriculum request per
 * program) was removed on 2026-10-06 now that the route is documented on both
 * backends. If a backend still lacks the route (404/405) the scope is empty
 * and flagged `isUnavailable`, so screens say the scope couldn't be worked
 * out instead of blaming admin setup.
 *
 * A UI convenience only; the backend enforces access.
 */
export function useMyTeachingScope(): MyTeachingScope {
  const liveQ = useQuery({
    queryKey: teachingScopeKeys.mine(),
    queryFn: () => teachingScopeApi.getMine(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const live = liveQ.data
  const { data: majorProgramsRes } = useMajorPrograms()

  const scoped = useMemo<TeachingScopeMajorProgram[]>(() => {
    if (!Array.isArray(live)) return []
    const names = new Map(
      (majorProgramsRes?.data ?? []).map((mp) => [mp.id, mp.name] as const)
    )
    return live
      .map((e) => ({
        id: e.majorProgramId,
        name:
          e.majorProgramName ??
          names.get(e.majorProgramId) ??
          `Major program #${e.majorProgramId}`,
        reasons: e.reasons,
        programs: [...e.programs].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [live, majorProgramsRes])

  const availability = useTeachingScopeAvailability()
  const isLoading = liveQ.isLoading

  return {
    majorPrograms: scoped,
    isLoading,
    isEmpty: !isLoading && scoped.length === 0,
    isUnavailable:
      !isLoading && scoped.length === 0 && availability.unavailable,
    isFailed: !isLoading && scoped.length === 0 && availability.failed,
    retry: availability.retry,
    programIdsIn: (majorProgramId) =>
      scoped
        .find((mp) => mp.id === majorProgramId)
        ?.programs.map((p) => p.id) ?? [],
  }
}

/**
 * Whether an empty teaching scope (useMyTeachingScope) can be trusted on the
 * tutor/HOD/dean screens. Only a live GET /me/teaching-scope answer is
 * authoritative: when that route is missing (404/405) or fails, or the
 * major-programs list it is named from fails, "nothing in scope" may just
 * mean the scope couldn't be worked out — not that an administrator still
 * has to record anything. Observes the same cached queries
 * useMyTeachingScope runs (same keys and options), so no extra requests.
 */
export function useTeachingScopeAvailability(): {
  /** The scope service is missing or failed; an empty scope is not real. */
  unavailable: boolean
  /** The live route itself failed (not just missing) — worth a retry. */
  failed: boolean
  retry: () => void
} {
  const liveQ = useQuery({
    queryKey: teachingScopeKeys.mine(),
    queryFn: () => teachingScopeApi.getMine(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const majorProgramsQ = useMajorPrograms()
  const routeMissing = liveQ.isSuccess && liveQ.data === null
  const failed = liveQ.isError || majorProgramsQ.isError
  return {
    unavailable: routeMissing || failed,
    failed,
    retry: () => {
      if (liveQ.isError) void liveQ.refetch()
      if (majorProgramsQ.isError) void majorProgramsQ.refetch()
    },
  }
}
