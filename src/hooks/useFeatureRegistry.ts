"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  featureRegistryKeys,
  featureRegistryMutationOptions,
  featureRegistryQueryOptions,
} from "@/services/featureRegistryApi"

export function useFeatureRegistry() {
  return useQuery({
    ...featureRegistryQueryOptions.list(),
    staleTime: 1000 * 60 * 3,
  })
}

export function useUpsertFeatureRegistry() {
  const qc = useQueryClient()

  return useMutation({
    ...featureRegistryMutationOptions.upsert(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: featureRegistryKeys.list() })
    },
  })
}

export function useDeleteFeatureRegistry() {
  const qc = useQueryClient()

  return useMutation({
    ...featureRegistryMutationOptions.remove(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: featureRegistryKeys.list() })
    },
  })
}
