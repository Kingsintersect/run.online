"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"

// Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
// `filters.majorProgramId` is send-only (see moodle-sync.service.ts's
// listCourses) — sent ahead of the backend per CLAUDE.md §14.
export function useSyncCourses(filters?: { majorProgramId?: number }) {
  return useQuery({
    queryKey: moodleSyncKeys.courses(filters),
    queryFn: () => moodleSyncService.listCourses(filters),
    staleTime: 60 * 1000,
  })
}

export function useSyncCourse(id: number) {
  return useQuery({
    queryKey: moodleSyncKeys.course(id),
    queryFn: () => moodleSyncService.getCourse(id),
    enabled: !!id,
  })
}

// Student-facing "My Courses" + SSO launch moved to the enrollment module —
// see modules/enrollment/hooks/use-enrollment-mutations.ts's
// useLaunchMoodleCourse. This module only owns admin-facing sync
// bookkeeping (push/pull/status), not the student's own course access.
