"use client"

import { useMemo } from "react"
import { useMyStudentId } from "./use-my-student-id"
import { useProgram } from "./useCourseStructure"
import { useAcademicSessions } from "./useAcademicSessions"
import { useSemesters } from "./useSemesters"
import { resolveActiveSession } from "@/lib/academic/resolve-active-session"
import type { AcademicSession, Semester } from "@/types/school"

// Resolves "the active academic session/semester" for the CURRENTLY LOGGED-IN
// STUDENT, scoped to their own program's major program.
//
// Major-Program Scoping — sandbox/major-program-scoping/
// FRONTEND_IMPLEMENTATION_PLAN.md §3 (STUDENT). Sessions can run independent
// calendars per major program (README.md §4.B: `AcademicSession.majorProgramId`,
// nullable = institution-wide shared session). A student whose program sits
// under a major program with its own calendar must resolve "current" through
// THAT scope, not a single institution-wide row — otherwise they'd see the
// wrong (or no) active session/semester.
//
// Mirrors the pattern `src/app/(dashboard)/admin/(routes)/timetable/page.tsx`
// already established for the admin Class Schedules screen: fetch every
// session (`GET /academic/sessions`, each row carries its own
// `majorProgramId`), resolve client-side via `resolveActiveSession()`, then
// fetch that session's semesters (`GET /academic/semesters?academicSessionId=`)
// and pick the active one. Deliberately NOT the older
// `/academic-calendar`/`/academic-calendar/sessions/active` endpoints (see
// `src/modules/timetable/services/timetable.service.ts`'s
// `academicCalendarService`) — that surface has no `majorProgramId` concept
// at all (confirmed against bruno/timetable/Academic Calendar - *.bru and
// the `AcademicCalendarMeta`/`Semester` types in
// `src/modules/timetable/types/timetable.types.ts`, neither of which carries
// the field), so it can't be made major-program-aware without a backend
// change. `/academic/sessions` + `/academic/semesters` already can.
//
// A single shared hook (per the plan's own §7 guidance: "a query parameter
// change on the existing hook, not a new UI surface") — every student screen
// that needs "my current session/semester" should consume this instead of
// re-deriving the resolution.
export function useMyActiveSession(): {
  session: AcademicSession | null
  currentSemester: Semester | null
  majorProgramId: number | null
  isLoading: boolean
} {
  const { programId, isLoading: loadingStudent } = useMyStudentId()
  const { data: programRes, isLoading: loadingProgram } = useProgram(programId)
  const { data: sessions, isLoading: loadingSessions } = useAcademicSessions()

  const majorProgramId = programRes?.data.majorProgramId ?? null

  const session = useMemo(
    () => resolveActiveSession(sessions, majorProgramId),
    [sessions, majorProgramId]
  )

  const { data: semesters, isLoading: loadingSemesters } = useSemesters(
    session?.id ?? null
  )

  const currentSemester = useMemo(
    () => semesters?.find((s) => s.isActive) ?? null,
    [semesters]
  )

  return {
    session,
    currentSemester,
    majorProgramId,
    isLoading:
      loadingStudent || loadingProgram || loadingSessions || loadingSemesters,
  }
}
