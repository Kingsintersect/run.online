"use client"

import { useMemo } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import { UserRole } from "@/config/nav.config"
import { useAllPrograms, useMajorPrograms } from "@/hooks/useCourseStructure"
import { useMyLecturerId } from "@/hooks/use-my-lecturer-id"
import { courseManagementQueryOptions } from "@/services/courseManagementApi"
import { usersQueryOptions } from "@/services/usersApi"
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
 * A UI convenience only; the backend enforces access.
 */
export function useMyTeachingScope(): MyTeachingScope {
  const activeRole = useAppStore((s) => s.activeRole)
  const grantScope = useAppStore((s) => s.user?.majorProgramScope)
  const { lecturerId, isLoading: loadingLecturer } = useMyLecturerId()
  const assignmentsQ = useQuery({
    ...usersQueryOptions.tutors.courses(lecturerId ?? 0),
    enabled: lecturerId != null,
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
    queries: candidatePrograms.map((p) => ({
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

  const isLoading =
    loadingLecturer ||
    (lecturerId != null && assignmentsQ.isLoading) ||
    loadingMajorPrograms ||
    loadingPrograms ||
    loadingCurricula

  return {
    majorPrograms,
    isLoading,
    isEmpty: !isLoading && majorPrograms.length === 0,
    programIdsIn: (majorProgramId) =>
      majorPrograms
        .find((mp) => mp.id === majorProgramId)
        ?.programs.map((p) => p.id) ?? [],
  }
}
