"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"

export function useSyncEnrollments(filters?: { status?: string }) {
  return useQuery({
    queryKey: moodleSyncKeys.enrollments(filters),
    queryFn: () => moodleSyncService.listEnrollments(filters),
    staleTime: 60 * 1000,
  })
}

export function useSyncEnrollmentErrors() {
  return useQuery({
    queryKey: moodleSyncKeys.enrollmentErrors(),
    queryFn: moodleSyncService.listEnrollmentErrors,
    staleTime: 30 * 1000,
  })
}
