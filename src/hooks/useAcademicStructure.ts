import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  academicStructureKeys,
  academicStructureMutationOptions,
  academicStructureQueryOptions,
} from "@/services/academicStructureApi"
import type { UpdateAcademicUnitPayload } from "@/types/school"

// ── Unit types ───────────────────────────────

export function useUnitTypes() {
  return useQuery({
    ...academicStructureQueryOptions.unitTypes.list(),
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateUnitType() {
  const qc = useQueryClient()
  return useMutation({
    ...academicStructureMutationOptions.createUnitType(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: academicStructureKeys.unitTypes.all,
      })
    },
  })
}

// ── Academic units (the tree) ────────────────

export function useAcademicUnits(
  params?: { parentId?: number; typeId?: number; rootsOnly?: boolean },
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...academicStructureQueryOptions.units.list(params),
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled,
  })
}

export function useAcademicUnit(id: number | null) {
  return useQuery({
    ...academicStructureQueryOptions.units.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateAcademicUnit() {
  const qc = useQueryClient()
  return useMutation({
    ...academicStructureMutationOptions.createUnit(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: academicStructureKeys.units.all })
    },
  })
}

export function useUpdateAcademicUnit() {
  const qc = useQueryClient()
  return useMutation({
    ...academicStructureMutationOptions.updateUnit(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateAcademicUnitPayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: academicStructureKeys.units.all }),
        qc.invalidateQueries({
          queryKey: academicStructureKeys.units.detail(variables.id),
        }),
      ])
    },
  })
}

export function useDeleteAcademicUnit() {
  const qc = useQueryClient()
  return useMutation({
    ...academicStructureMutationOptions.deleteUnit(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: academicStructureKeys.units.all })
    },
  })
}
