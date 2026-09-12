"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMyLecturerId } from "@/hooks/use-my-lecturer-id"
import { tutorCoursesService } from "../services/tutor-courses.service"
import type { ScheduleSlotDraft } from "../types"

export const tutorCoursesKeys = {
  all: ["tutor-courses"] as const,
  assigned: (lecturerId: number | null) =>
    [...tutorCoursesKeys.all, "assigned", lecturerId] as const,
}

export function useAssignedCourses() {
  const { lecturerId, isLoading: resolvingLecturerId } = useMyLecturerId()

  const query = useQuery({
    queryKey: tutorCoursesKeys.assigned(lecturerId),
    queryFn: () => tutorCoursesService.getAssignedCourses(lecturerId as number),
    enabled: lecturerId !== null,
  })

  return {
    courses: query.data ?? [],
    loading: resolvingLecturerId || query.isLoading,
    error: query.isError ? "Failed to load assigned courses." : null,
  }
}

// Reconciles the editor's full slot list against what already existed:
// create rows with no id, update rows whose id already existed but changed,
// delete rows whose id no longer appears. There is no single "replace this
// course's schedule" endpoint — the real API is per-slot CRUD.
export function useSyncSchedule() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      offeringId,
      lecturerId,
      original,
      next,
    }: {
      offeringId: number
      lecturerId: number
      original: ScheduleSlotDraft[]
      next: ScheduleSlotDraft[]
    }) => {
      const nextIds = new Set(next.filter((s) => s.id != null).map((s) => s.id))
      const toDelete = original.filter(
        (s) => s.id != null && !nextIds.has(s.id)
      )
      const toCreate = next.filter((s) => s.id == null)
      const toUpdate = next.filter(
        (s): s is ScheduleSlotDraft & { id: number } => s.id != null
      )

      await Promise.all([
        ...toDelete.map((s) => tutorCoursesService.removeScheduleSlot(s.id!)),
        ...toCreate.map((s) =>
          tutorCoursesService.addScheduleSlot(offeringId, lecturerId, {
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            venue: s.venue,
            classType: s.classType,
          })
        ),
        ...toUpdate.map((s) =>
          tutorCoursesService.updateScheduleSlot(s.id, {
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            venue: s.venue,
            classType: s.classType,
          })
        ),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tutorCoursesKeys.all })
    },
  })
}
