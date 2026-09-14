import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  examTimetableKeys,
  examTimetableMutationOptions,
  examTimetableQueryOptions,
  examSchedulesApi,
} from "../services/exam-timetable.service"
import type {
  UpdateVenuePayload,
  UpdateExamSchedulePayload,
  ExamScheduleFilters,
  ExamConflictCheckParams,
} from "../types/exam-timetable.types"

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md.

// ── Venues ──────────────────────────────────

export function useVenues(filters?: {
  isExamHall?: boolean
  isActive?: boolean
}) {
  return useQuery({
    ...examTimetableQueryOptions.venues.list(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateVenue() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.createVenue(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: examTimetableKeys.venues.all })
    },
  })
}

export function useUpdateVenue() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.updateVenue(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateVenuePayload }
    ) => {
      void variables
      await qc.invalidateQueries({ queryKey: examTimetableKeys.venues.all })
    },
  })
}

export function useRemoveVenue() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.removeVenue(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: examTimetableKeys.venues.all })
    },
  })
}

// ── Exam Schedules ──────────────────────────

export function useExamSchedules(filters?: ExamScheduleFilters) {
  return useQuery({
    ...examTimetableQueryOptions.exams.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useMyExamSchedules() {
  return useQuery({
    ...examTimetableQueryOptions.exams.mine(),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateExamSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.createExamSchedule(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: examTimetableKeys.exams.all })
    },
  })
}

export function useUpdateExamSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.updateExamSchedule(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateExamSchedulePayload }
    ) => {
      void variables
      await qc.invalidateQueries({ queryKey: examTimetableKeys.exams.all })
    },
  })
}

export function useRemoveExamSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...examTimetableMutationOptions.removeExamSchedule(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: examTimetableKeys.exams.all })
    },
  })
}

// Advisory conflict check — called by the form before submit, not cached as
// a query since it's a point-in-time check against form-in-progress values.
export function useCheckExamConflict() {
  return useMutation({
    mutationFn: (params: ExamConflictCheckParams) =>
      examSchedulesApi.checkConflict(params),
  })
}
