"use client"

import { useMemo } from "react"
import { useAllPrograms } from "./useCourseStructure"
import { useStudents } from "@/modules/user-management/hooks/useUsersData"

// Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35 (per
// sandbox/major-program-scoping/ENDPOINT_INVENTORY.md, Documents/Hostels
// (Allocations)/Clearance are all ❌ unscoped). Unlike Invoices/Students,
// none of these three modules' records carry a nested `student.programName`
// (or any student object at all) — only a bare `studentId` number — so
// there's nothing to name-match against directly the way
// overdue-report.tsx/StudentList.tsx do. This hook bridges that gap by
// cross-referencing the student roster (`Student.program_name`, the same
// source of truth used everywhere else) to build a studentId ->
// majorProgramId lookup. Shared across Document/Clearance/Hostel-Allocation
// admin screens (CLAUDE.md §4: reused across 2+ modules -> global hook, not
// module-local).
//
// Best-effort, not exhaustive: `useStudents()` returns one page of the
// roster (default limit 100, same default `usersApi.listStudents` already
// uses everywhere else) — a studentId outside that page resolves to
// `undefined` ("unresolved"), never coerced to "no major program". Every
// caller must treat `undefined` as "don't filter this record out" (fail
// open), the same discipline `overdue-report.tsx` already applies via its
// `!inv.student?.programName || programNamesInScope.has(...)` check — this
// filter must never silently hide a record just because its student wasn't
// in the fetched page.
export function useStudentMajorProgramMap() {
  const { data: studentsRes, isLoading: studentsLoading } = useStudents()
  const { data: programsRes, isLoading: programsLoading } = useAllPrograms()

  const majorProgramIdByProgramName = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const p of programsRes?.data ?? []) {
      map.set(p.name, p.majorProgramId ?? null)
    }
    return map
  }, [programsRes])

  const majorProgramIdByStudentId = useMemo(() => {
    const map = new Map<number, number | null>()
    for (const s of studentsRes?.data ?? []) {
      map.set(s.id, majorProgramIdByProgramName.get(s.program_name) ?? null)
    }
    return map
  }, [studentsRes, majorProgramIdByProgramName])

  return {
    /**
     * `null` = resolved, genuinely has no major program.
     * `undefined` = student not in the fetched roster page — unresolved,
     * not the same as "no program". Callers must not filter these out.
     */
    getMajorProgramId: (
      studentId: number | null | undefined
    ): number | null | undefined =>
      studentId == null ? undefined : majorProgramIdByStudentId.get(studentId),
    isLoading: studentsLoading || programsLoading,
  }
}
