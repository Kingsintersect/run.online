"use client"

import { useQuery } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"

export function useSyncGrades(filters?: {
  courseId?: number
  userId?: number
}) {
  return useQuery({
    queryKey: moodleSyncKeys.grades(filters),
    queryFn: () => moodleSyncService.listGrades(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSyncGradesByCourse(courseOfferingId: number) {
  return useQuery({
    queryKey: moodleSyncKeys.gradesByCourse(courseOfferingId),
    queryFn: () => moodleSyncService.listGradesByCourse(courseOfferingId),
    enabled: !!courseOfferingId,
  })
}

export function useMyMoodleGrades() {
  return useQuery({
    queryKey: moodleSyncKeys.myGrades(),
    queryFn: moodleSyncService.getMyGrades,
    staleTime: 5 * 60 * 1000,
  })
}
