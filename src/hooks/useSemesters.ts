import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  feeManagementKeys,
  feeManagementMutationOptions,
  feeManagementQueryOptions,
} from "@/services/feeManagementApi"
import type { CreateSemesterPayload } from "@/types/school"

export function useSemesters(sessionId: number | null) {
  return useQuery({
    ...feeManagementQueryOptions.semestersBySession(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateSemester() {
  const qc = useQueryClient()
  return useMutation({
    ...feeManagementMutationOptions.createSemester(),
    onSuccess: async (_data, variables: CreateSemesterPayload) => {
      await qc.invalidateQueries({
        queryKey: feeManagementKeys.semestersBySession(
          variables.academicSessionId
        ),
      })
    },
  })
}

export function useActivateSemester(sessionId: number) {
  const qc = useQueryClient()
  return useMutation({
    ...feeManagementMutationOptions.activateSemester(),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({
          queryKey: feeManagementKeys.semestersBySession(sessionId),
        }),
        qc.invalidateQueries({ queryKey: feeManagementKeys.sessions() }),
      ])
    },
  })
}
