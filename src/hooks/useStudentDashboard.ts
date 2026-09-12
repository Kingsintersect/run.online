"use client"

import { useMemo } from "react"
import { useMyStudentId } from "@/hooks/use-my-student-id"
import { useMyTimetable } from "@/modules/timetable/hooks/useTimetable"
import { useEnrollmentsByStudent } from "@/modules/enrollment/hooks/use-enrollments"
import { useAttendanceByStudent } from "@/modules/enrollment/hooks/use-attendance"
import { useStudentCgpa } from "@/modules/student-grades/hooks/use-grades-data"
import type { DayOfWeek } from "@/modules/timetable/types/timetable.types"

const TODAY_KEY: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]

export function useStudentDashboardData() {
  const { studentId, isLoading: resolvingStudentId } = useMyStudentId()

  const { data: timetableData, isLoading: timetableLoading } = useMyTimetable()
  const { data: enrollments, isLoading: enrollmentsLoading } =
    useEnrollmentsByStudent(studentId)
  // Raw attendance rows only — one request. The dashboard shows a single
  // overall figure, so it doesn't need `useAttendanceSummary`'s per-course
  // breakdown, which additionally fans out to `/timetable/schedules/offering/:id`
  // (forbidden for students) and refetches the enrolment list.
  const { data: attendanceRows, isLoading: attendanceLoading } =
    useAttendanceByStudent(studentId)
  // CGPA number only — one request, no accompanying full grade list.
  const { currentCGPA, loading: cgpaLoading } = useStudentCgpa(studentId)

  const slots = useMemo(
    () =>
      Array.isArray(timetableData)
        ? timetableData
        : Object.values(timetableData ?? {}).flat(),
    [timetableData]
  )
  const today = TODAY_KEY[new Date().getDay()]
  const todaysSessions = useMemo(
    () =>
      slots
        .filter((s) => s.dayOfWeek === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, today]
  )

  const activeEnrollments = (enrollments ?? []).filter(
    (e) => e.status === "ENROLLED"
  )
  const totalUnits = activeEnrollments.reduce((a, e) => a + e.creditUnits, 0)

  const overallAttendance = useMemo(() => {
    if (!attendanceRows || attendanceRows.length === 0) return null
    const attended = attendanceRows.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length
    return Math.round((attended / attendanceRows.length) * 100)
  }, [attendanceRows])

  return {
    studentId,
    todaysSessions,
    activeCourseCount: activeEnrollments.length,
    totalUnits,
    overallAttendance,
    currentCGPA,
    isLoading:
      resolvingStudentId ||
      timetableLoading ||
      enrollmentsLoading ||
      attendanceLoading ||
      cgpaLoading,
  }
}
