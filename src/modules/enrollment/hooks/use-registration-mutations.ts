"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createApiMutationOptions } from "@/lib/clients/apiClient"
import { SubmitRegistrationSchema } from "../schemas"
import { enrollmentApi, enrollmentKeys } from "../services/enrollment.service"
import type { BulkEnrollResult, SubmitRegistrationDto } from "../types"

// Submits the session registration through the existing self-enrollment
// write endpoint (the contract keeps its path): one `POST /enrollments` per
// offering, per-offering outcomes with the backend's error code attached.
// The payload is validated before dispatch; the backend enforces every rule
// (debt gate, credit load, prerequisites, carryovers, window).
export function useSubmitRegistration() {
  const qc = useQueryClient()
  return useMutation({
    ...createApiMutationOptions<BulkEnrollResult, SubmitRegistrationDto>({
      mutationKey: [...enrollmentKeys.all, "submit-registration"],
      mutationFn: (dto) => {
        const valid = SubmitRegistrationSchema.parse(dto)
        return enrollmentApi.selfEnrollMany(
          valid.studentId,
          valid.offeringIds.map((offeringId) => ({
            offeringId,
            semesterId: valid.semesterId,
          }))
        )
      },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: enrollmentKeys.all }),
  })
}
