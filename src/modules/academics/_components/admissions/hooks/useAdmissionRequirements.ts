import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  admissionSetupKeys,
  admissionSetupMutationOptions,
  admissionSetupQueryOptions,
} from "@/services/admissionSetupApi"
import type { CreateAdmissionRequirementPayload } from "@/types/school"
import type { AdmissionRequirement } from "@/types/school"

export function useAdmissionRequirements(cycleId: number | null) {
  return useQuery<AdmissionRequirement[]>({
    ...admissionSetupQueryOptions.requirementsByCycle(cycleId!),
    enabled: !!cycleId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAdmissionRequirement() {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.createRequirement(),
    onSuccess: async (_data, variables: CreateAdmissionRequirementPayload) => {
      await qc.invalidateQueries({
        queryKey: admissionSetupKeys.requirementsByCycle(
          variables.admission_cycle_id
        ),
      })
    },
  })
}

export function useDeleteAdmissionRequirement(cycleId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.deleteRequirement(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: admissionSetupKeys.requirementsByCycle(cycleId),
      })
    },
  })
}
