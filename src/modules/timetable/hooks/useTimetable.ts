"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  timetableKeys,
  timetableMutationOptions,
  timetableQueryOptions,
} from "../services/timetable.service"
import type { ScheduleFilter } from "../types/timetable.types"

// ── Read hooks ────────────────────────────────────────────────────────────────

export function useMyTimetable(params?: {
  semesterId?: number
  groupByDay?: boolean
}) {
  return useQuery({
    ...timetableQueryOptions.my(params),
    staleTime: 5 * 60 * 1000,
  })
}

export function useTutorTimetable(
  tutorId: number,
  params?: { semesterId?: number }
) {
  return useQuery({
    ...timetableQueryOptions.tutor(tutorId, params),
    staleTime: 5 * 60 * 1000,
    enabled: tutorId > 0,
  })
}

export function useStudentTimetable(
  studentId: number,
  params?: { semesterId?: number }
) {
  return useQuery({
    ...timetableQueryOptions.student(studentId, params),
    staleTime: 5 * 60 * 1000,
    enabled: studentId > 0,
  })
}

export function useAllSchedules(filters?: ScheduleFilter) {
  return useQuery({
    ...timetableQueryOptions.admin(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useScheduleById(id: number) {
  return useQuery({
    ...timetableQueryOptions.detail(id),
    staleTime: 5 * 60 * 1000,
    enabled: id > 0,
  })
}

export function useSchedulesByOffering(offeringId: number) {
  return useQuery({
    ...timetableQueryOptions.byOffering(offeringId),
    staleTime: 5 * 60 * 1000,
    enabled: offeringId > 0,
  })
}

export function useSchedulesByLecturer(lecturerId: number | null) {
  return useQuery({
    ...timetableQueryOptions.schedulesByLecturer(lecturerId ?? 0),
    staleTime: 5 * 60 * 1000,
    enabled: !!lecturerId && lecturerId > 0,
  })
}

export function useSchedulesBySemester(semesterId: number | null) {
  return useQuery({
    ...timetableQueryOptions.schedulesBySemester(semesterId ?? 0),
    staleTime: 5 * 60 * 1000,
    enabled: !!semesterId && semesterId > 0,
  })
}

export function useVenues() {
  return useQuery({
    ...timetableQueryOptions.venues(),
    staleTime: 10 * 60 * 1000,
  })
}

export function useVenueAvailability(
  params: {
    venue: string
    dayOfWeek: string
    semesterId: number
    excludeScheduleId?: number
  } | null
) {
  return useQuery({
    ...timetableQueryOptions.venueAvailability(
      params as Parameters<typeof timetableQueryOptions.venueAvailability>[0]
    ),
    enabled: !!params?.venue && !!params?.dayOfWeek && !!params?.semesterId,
    staleTime: 0,
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...timetableMutationOptions.create(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.all })
    },
  })
}

export function useUpdateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...timetableMutationOptions.update(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.all })
    },
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...timetableMutationOptions.delete(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.all })
    },
  })
}
