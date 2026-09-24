"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"
import type { AssessmentFilter } from "../types"

export function useSyncAssessments(filters?: {
  courseId?: number
  type?: string
}) {
  return useQuery({
    queryKey: moodleSyncKeys.assessments(filters),
    queryFn: () => moodleSyncService.listAssessments(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSyncAssessmentsByCourse(courseOfferingId: number) {
  return useQuery({
    queryKey: moodleSyncKeys.assessmentsByCourse(courseOfferingId),
    queryFn: () => moodleSyncService.listAssessmentsByCourse(courseOfferingId),
    enabled: !!courseOfferingId,
  })
}

export function useUpcomingAssessments() {
  return useQuery({
    queryKey: moodleSyncKeys.assessmentsUpcoming(),
    queryFn: moodleSyncService.listUpcomingAssessments,
    // cron pulls every 30 min server-side; no need to poll aggressively
    staleTime: 5 * 60 * 1000,
  })
}

// ── Paginated/filtered list — Admin & Tutor "browse assessments" screens ───

export function useAssessmentsList(filters?: Partial<AssessmentFilter>) {
  return useQuery({
    queryKey: moodleSyncKeys.assessmentsList(filters),
    queryFn: () => moodleSyncService.listAssessmentsPaginated(filters),
    staleTime: 5 * 60 * 1000,
  })
}

// Tutor's own "browse assessments" screen — scoped to their own assigned
// offerings (see moodleSyncService.getMyTutorAssessments's own comment for
// why this composes two real endpoints instead of one filtered call).
export function useMyTutorAssessmentsList(
  lecturerId: number | null,
  filters?: Partial<
    Pick<AssessmentFilter, "type" | "isVisible" | "page" | "limit">
  >
) {
  return useQuery({
    queryKey: [
      ...moodleSyncKeys.assessmentsList(filters),
      "my-tutor",
      lecturerId,
    ],
    queryFn: () =>
      moodleSyncService.getMyTutorAssessments(lecturerId as number, filters),
    enabled: lecturerId !== null,
    staleTime: 3 * 60 * 1000,
  })
}

export function useAssessment(id: number | null) {
  return useQuery({
    queryKey: moodleSyncKeys.assessment(id ?? 0),
    queryFn: () => moodleSyncService.getAssessment(id as number),
    enabled: id !== null && id > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyAssessmentsList(
  filters?: Partial<
    Pick<AssessmentFilter, "type" | "upcoming" | "page" | "limit">
  >
) {
  return useQuery({
    queryKey: moodleSyncKeys.assessmentsMy(filters),
    queryFn: () => moodleSyncService.getMyAssessments(filters),
    staleTime: 3 * 60 * 1000,
  })
}

// `enabled` added 2026-09-12 — see the matching note on
// useCollectionsSummary in use-fee-reports.ts. Confirmed live: DEAN gets a
// 403 on /assessments/sync/status too.
export function useAssessmentSyncStatus(enabled = true) {
  return useQuery({
    queryKey: moodleSyncKeys.assessmentSyncStatus(),
    queryFn: () => moodleSyncService.getAssessmentSyncStatus(),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    enabled,
  })
}
