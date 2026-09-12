"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  enrollmentMutationOptions,
  enrollmentKeys,
} from "../services/enrollment.service"

export function useCreateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.create(),
    onSuccess: () => qc.invalidateQueries({ queryKey: enrollmentKeys.all }),
  })
}

export function useBulkEnroll() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.bulkCreate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: enrollmentKeys.all }),
  })
}

// Student multi-course registration — loops POST /enrollments under the hood
// (bulk endpoint is Admin-only). Resolves with per-offering enrolled/errors.
export function useSelfEnrollMany() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.selfEnrollMany(),
    onSuccess: () => qc.invalidateQueries({ queryKey: enrollmentKeys.all }),
  })
}

export function useDropEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.drop(),
    onSuccess: () => qc.invalidateQueries({ queryKey: enrollmentKeys.all }),
  })
}

// Button-triggered (mints a fresh one-time launch URL per click), not a
// query — no invalidation needed, this doesn't change enrollment state.
export function useLaunchMoodleCourse() {
  return useMutation(enrollmentMutationOptions.launchMoodleCourse())
}
