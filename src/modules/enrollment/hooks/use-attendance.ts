"use client"

import { useQuery } from "@tanstack/react-query"
import { enrollmentQueryOptions } from "../services/enrollment.service"

export function useAttendanceBySchedule(
  scheduleId: number | null,
  attendanceDate?: string
) {
  return useQuery({
    ...enrollmentQueryOptions.attendanceBySchedule(
      scheduleId ?? 0,
      attendanceDate
    ),
    enabled: scheduleId !== null && scheduleId > 0,
  })
}

export function useAttendanceByStudent(studentId: number | null) {
  return useQuery({
    ...enrollmentQueryOptions.attendanceByStudent(studentId ?? 0),
    enabled: studentId !== null && studentId > 0,
  })
}

export function useAttendanceSummary(studentId: number | null) {
  return useQuery({
    ...enrollmentQueryOptions.attendanceSummary(studentId ?? 0),
    enabled: studentId !== null && studentId > 0,
    staleTime: 60 * 1000,
  })
}
