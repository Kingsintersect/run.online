import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  feeManagementKeys,
  feeManagementMutationOptions,
  feeManagementQueryOptions,
} from "@/services/feeManagementApi"
import type { UpdateAcademicSessionPayload } from "@/types/school"

export function useAcademicSessions() {
  return useQuery({
    ...feeManagementQueryOptions.sessions(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useAcademicSession(id: number | null) {
  return useQuery({
    ...feeManagementQueryOptions.sessionDetail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    ...feeManagementMutationOptions.createSession(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: feeManagementKeys.sessions() })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    ...feeManagementMutationOptions.updateSession(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateAcademicSessionPayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: feeManagementKeys.sessions() }),
        qc.invalidateQueries({
          queryKey: feeManagementKeys.sessionDetail(variables.id),
        }),
      ])
    },
  })
}

export function useActivateSession() {
  const qc = useQueryClient()
  return useMutation({
    ...feeManagementMutationOptions.activateSession(),
    onSuccess: async (_data, id) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: feeManagementKeys.sessions() }),
        qc.invalidateQueries({ queryKey: feeManagementKeys.sessionDetail(id) }),
      ])
    },
  })
}
