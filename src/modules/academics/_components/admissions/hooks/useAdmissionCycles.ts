import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  admissionSetupKeys,
  admissionSetupMutationOptions,
  admissionSetupQueryOptions,
} from "@/services/admissionSetupApi"
import type {
  AdmissionCycleStatus,
  CreateAdmissionCyclePayload,
  UpdateAdmissionCyclePayload,
} from "@/types/school"

// Major-Program Scoping — sandbox/major-program-scoping/. `majorProgramId`
// is a no-op today (cycles fully inherit scope from `sessionId` already, per
// admissionSetupApi.ts's note on listCyclesBySession) but is threaded
// through here so callers filtering by major program (AdmissionPageContainer
// already does, at the session-picker level) can pass it once the backend
// starts honoring it directly.
export function useAdmissionCycles(
  sessionId: number | null,
  majorProgramId?: number | null
) {
  return useQuery({
    ...admissionSetupQueryOptions.cyclesBySession(sessionId!, majorProgramId),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAdmissionCycle(id: number | null) {
  return useQuery({
    ...admissionSetupQueryOptions.cycleDetail(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateAdmissionCycle() {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.createCycle(),
    onSuccess: async (_data, variables: CreateAdmissionCyclePayload) => {
      await qc.invalidateQueries({
        queryKey: admissionSetupKeys.cyclesBySessionPrefix(
          variables.academic_session_id
        ),
      })
    },
  })
}

export function useUpdateAdmissionCycle(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.updateCycle(),
    onSuccess: async (
      _data,
      variables: { id: number; payload: UpdateAdmissionCyclePayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: admissionSetupKeys.cyclesBySessionPrefix(sessionId),
        }),
        qc.invalidateQueries({
          queryKey: admissionSetupKeys.cycleDetail(variables.id),
        }),
      ])
    },
  })
}

export function useDeleteAdmissionCycle(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.deleteCycle(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: admissionSetupKeys.cyclesBySessionPrefix(sessionId),
      })
    },
  })
}

export function useUpdateAdmissionStatus(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...admissionSetupMutationOptions.updateCycleStatus(),
    onSuccess: async (
      _data,
      variables: { id: number; status: AdmissionCycleStatus }
    ) => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: admissionSetupKeys.cyclesBySessionPrefix(sessionId),
        }),
        qc.invalidateQueries({
          queryKey: admissionSetupKeys.cycleDetail(variables.id),
        }),
      ])
    },
  })
}
