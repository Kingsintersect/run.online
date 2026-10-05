"use client"

import { useMemo } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import { UserRole } from "@/config/nav.config"
import { useAllPrograms, useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMyLecturerId } from "@/hooks/use-my-lecturer-id"
import { courseManagementQueryOptions } from "@/services/courseManagementApi"
import { usersQueryOptions } from "@/services/usersApi"
import {
  teachingScopeApi,
  teachingScopeKeys,
} from "@/services/teachingScopeApi"
import { useAppStore } from "@/store"

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
   * Loaded and empty, but only because the scope service is missing (404/405)
   * or failed — not a real "nothing assigned to you". Screens must not blame
   * admin setup in this case (see teachingScopeUnavailableMessage).
   */
  isUnavailable: boolean
  /** The scope request itself failed (not just missing) — worth a retry. */
  isFailed: boolean
  retry: () => void
  /** The program ids in a major program, for filtering a list client-side. */
  programIdsIn: (majorProgramId: number) => number[]
}

const LEAD_ROLES = new Set<UserRole>([UserRole.HOD, UserRole.DEAN])

/**
 * Where the logged-in tutor, HOD or dean may look: the major programs and
 * programs they **teach in** or **head**, and nothing else. A lecturer can
 * teach across major programs (B.Sc, postgraduate, business school…), so the
 * tutor-side screens offer a selector built from this rather than one fixed
 * major program (sandbox/cross-program-teaching).
 *
 * - teaches: the offerings assigned to them (GET /courses/offerings?lecturerId=),
 *   by each offering's real owners (`majorProgramIds`). A program counts when
 *   its curriculum (GET /courses/programs/{id}) contains one of their courses.
 *   Offerings don't list their programs yet (A49.6), so the curricula of the
 *   programs in those major programs are read, one request per program, cached.
 * - heads (HOD, dean): the major programs of their role grant
 *   (`majorProgramScope`) and all programs in them. Once the backend exposes
 *   the department/faculty they lead (A49.3), this narrows to those programs.
 *   An unscoped HOD/dean grant gives no "heads" scope, so they never see
 *   everything by default.
 *
 * Source of truth: GET /me/teaching-scope, live since 2026-09-27. Whenever
 * that route exists its answer is used as-is, even when empty (for example
 * an HOD not yet recorded as any department's head sees nothing). The
 * derivation above runs only when the route is missing (404/405), so the
 * screens keep working against an older backend. Same interface either way.
 *
 * A UI convenience only; the backend enforces access.
 */
export function useMyTeachingScope(): MyTeachingScope {
  const activeRole = useAppStore((s) => s.activeRole)
  const grantScope = useAppStore((s) => s.user?.majorProgramScope)
  const liveQ = useQuery({
    queryKey: teachingScopeKeys.mine(),
    queryFn: () => teachingScopeApi.getMine(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  // undefined = still loading; null = route missing, derive; array = live.
  const live = liveQ.data
  const derive = live === null || liveQ.isError
  const { lecturerId, isLoading: loadingLecturer } = useMyLecturerId()
  const assignmentsQ = useQuery({
    ...usersQueryOptions.tutors.courses(lecturerId ?? 0),
    enabled: derive && lecturerId != null,
    staleTime: 5 * 60 * 1000,
  })
  const { data: majorProgramsRes, isLoading: loadingMajorPrograms } =
    useMajorPrograms()
  const { data: programsRes, isLoading: loadingPrograms } = useAllPrograms()

  const assignments = useMemo(
    () => assignmentsQ.data?.data ?? [],
    [assignmentsQ.data]
  )
  const teachingMajorProgramIds = useMemo(
    () =>
      new Set(assignments.flatMap((a) => a.offering.major_program_ids ?? [])),
    [assignments]
  )
  const myCourseCodes = useMemo(
    () => new Set(assignments.map((a) => a.offering.course_code)),
    [assignments]
  )
  const candidatePrograms = useMemo(
    () =>
      (programsRes?.data ?? []).filter(
        (p) =>
          p.isActive &&
          p.majorProgramId != null &&
          teachingMajorProgramIds.has(p.majorProgramId)
      ),
    [programsRes, teachingMajorProgramIds]
  )
  const curricula = useQueries({
    queries: (derive ? candidatePrograms : []).map((p) => ({
      ...courseManagementQueryOptions.programCourses.byProgram(p.id),
      staleTime: 5 * 60 * 1000,
    })),
  })

  const leadMajorProgramIds = useMemo(() => {
    if (activeRole == null || !LEAD_ROLES.has(activeRole))
      return new Set<number>()
    if (!Array.isArray(grantScope)) return new Set<number>()
    return new Set(grantScope.map((mp) => mp.id))
  }, [activeRole, grantScope])

  const curriculaKey = curricula.map((c) => c.dataUpdatedAt).join(",")
  const loadingCurricula = curricula.some((c) => c.isLoading)

  const majorPrograms = useMemo(() => {
    const names = new Map(
      (majorProgramsRes?.data ?? []).map((mp) => [mp.id, mp.name] as const)
    )
    const programs = programsRes?.data ?? []
    const byMajor = new Map<number, TeachingScopeMajorProgram>()
    const ensure = (id: number) => {
      const existing = byMajor.get(id)
      if (existing) return existing
      const created: TeachingScopeMajorProgram = {
        id,
        name: names.get(id) ?? `Major program #${id}`,
        reasons: [],
        programs: [],
      }
      byMajor.set(id, created)
      return created
    }
    const addProgram = (
      mp: TeachingScopeMajorProgram,
      id: number,
      name: string,
      reason: TeachingScopeReason
    ) => {
      const found = mp.programs.find((p) => p.id === id)
      if (found) {
        if (!found.reasons.includes(reason)) found.reasons.push(reason)
      } else mp.programs.push({ id, name, reasons: [reason] })
    }

    // Teaches: programs whose curriculum has one of my courses.
    candidatePrograms.forEach((p, i) => {
      const codes = (curricula[i]?.data?.data ?? []).map((c) => c.code)
      if (!codes.some((code) => myCourseCodes.has(code))) return
      if (p.majorProgramId == null) return
      const mp = ensure(p.majorProgramId)
      if (!mp.reasons.includes("teaches")) mp.reasons.push("teaches")
      addProgram(mp, p.id, p.name, "teaches")
    })
    // A taught major program with no curriculum match still counts.
    for (const id of teachingMajorProgramIds) {
      const mp = ensure(id)
      if (!mp.reasons.includes("teaches")) mp.reasons.push("teaches")
    }
    // Heads: every program in the major programs of the HOD/dean grant.
    for (const id of leadMajorProgramIds) {
      const mp = ensure(id)
      if (!mp.reasons.includes("heads")) mp.reasons.push("heads")
      for (const p of programs)
        if (p.isActive && p.majorProgramId === id)
          addProgram(mp, p.id, p.name, "heads")
    }

    return [...byMajor.values()]
      .map((mp) => ({
        ...mp,
        programs: mp.programs.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    // curriculaKey stands in for the per-query results.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    majorProgramsRes,
    programsRes,
    candidatePrograms,
    curriculaKey,
    myCourseCodes,
    teachingMajorProgramIds,
    leadMajorProgramIds,
  ])

  const liveMajorPrograms = useMemo(() => {
    if (!Array.isArray(live)) return null
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

  const scoped = liveMajorPrograms ?? majorPrograms
  const availability = useTeachingScopeAvailability()
  // While deriving (route missing), a failed assignments read also leaves the
  // scope empty for a reason that isn't "nothing assigned".
  const deriveFailed = derive && assignmentsQ.isError
  const isLoading =
    liveQ.isLoading ||
    (derive &&
      (loadingLecturer ||
        (lecturerId != null && assignmentsQ.isLoading) ||
        loadingMajorPrograms ||
        loadingPrograms ||
        loadingCurricula))

  return {
    majorPrograms: scoped,
    isLoading,
    isEmpty: !isLoading && scoped.length === 0,
    isUnavailable:
      !isLoading &&
      scoped.length === 0 &&
      (availability.unavailable || deriveFailed),
    isFailed:
      !isLoading &&
      scoped.length === 0 &&
      (availability.failed || deriveFailed),
    retry: () => {
      availability.retry()
      if (assignmentsQ.isError) void assignmentsQ.refetch()
    },
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
