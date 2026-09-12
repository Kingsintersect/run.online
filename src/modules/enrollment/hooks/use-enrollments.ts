"use client"

import { useQuery } from "@tanstack/react-query"
import { enrollmentQueryOptions } from "../services/enrollment.service"
import type { EnrollmentFilter, EnrollmentStatus } from "../types"

export function useEnrollments(filters?: Partial<EnrollmentFilter>) {
  return useQuery({
    ...enrollmentQueryOptions.list(filters),
    staleTime: 60 * 1000,
  })
}

export function useEnrollment(id: number | null) {
  return useQuery({
    ...enrollmentQueryOptions.detail(id ?? 0),
    enabled: id !== null && id > 0,
  })
}

export function useEnrollmentsByStudent(
  studentId: number | null,
  params?: { semesterId?: number; status?: EnrollmentStatus }
) {
  return useQuery({
    ...enrollmentQueryOptions.byStudent(studentId ?? 0, params),
    enabled: studentId !== null && studentId > 0,
    staleTime: 60 * 1000,
  })
}

export function useEnrollmentsByOffering(offeringId: number | null) {
  return useQuery({
    ...enrollmentQueryOptions.byOffering(offeringId ?? 0),
    enabled: offeringId !== null && offeringId > 0,
    staleTime: 60 * 1000,
  })
}

// Self-scoped course list with the per-course `moodleSynced` flag. Optional
// enrichment layer over useEnrollmentsByStudent — 404s until the backend
// ships `GET /students/me/courses`, so consumers must treat an error/empty
// result as "flag unknown", not "no courses".
export function useMyCourses(enabled = true) {
  return useQuery({
    ...enrollmentQueryOptions.myCourses(),
    enabled,
  })
}
