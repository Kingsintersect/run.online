import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  courseOfferingKeys,
  courseOfferingMutationOptions,
  courseOfferingQueryOptions,
  type OfferingListFilters,
} from "@/services/courseOfferingApi"
import { getErrorMessage } from "@/lib/errors"

// ── Offerings ────────────────────────────────

export function useCourseOfferings(filters?: OfferingListFilters) {
  return useQuery({
    ...courseOfferingQueryOptions.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCourseOffering(id: number | null) {
  return useQuery({
    ...courseOfferingQueryOptions.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateOffering() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.create(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseOfferingKeys.all })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to create offering")),
  })
}

export function useUpdateOffering() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.update(),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseOfferingKeys.all }),
        qc.invalidateQueries({
          queryKey: courseOfferingKeys.detail(variables.id),
        }),
      ])
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to update offering")),
  })
}

export function useCancelOffering() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.cancel(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseOfferingKeys.all })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to cancel offering")),
  })
}

// ── Offering Lecturers ───────────────────────

export function useAssignLecturer() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.assignLecturer(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: courseOfferingKeys.detail(variables.offering_id),
      })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to assign lecturer")),
  })
}

export function useRemoveLecturer() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.removeLecturer(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: courseOfferingKeys.detail(variables.offeringId),
      })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to remove lecturer")),
  })
}

// ── Class Schedules ──────────────────────────

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.createSchedule(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: courseOfferingKeys.detail(variables.offering_id),
      })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to create schedule")),
  })
}

export function useUpdateSchedule(offeringId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.updateSchedule(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseOfferingKeys.detail(offeringId),
      })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to update schedule")),
  })
}

export function useRemoveSchedule(offeringId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...courseOfferingMutationOptions.removeSchedule(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseOfferingKeys.detail(offeringId),
      })
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Failed to remove schedule")),
  })
}
