"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  featureFlagKeys,
  featureFlagMutationOptions,
  featureFlagQueryOptions,
  type SaveFeatureFlagPayload,
} from "@/services/featureFlagApi"

export function useFeatureFlags(instanceId = "default") {
  return useQuery({
    ...featureFlagQueryOptions.detail(instanceId),
    staleTime: 1000 * 60 * 3,
  })
}

export function useSaveFeatureFlags(instanceId = "default") {
  const qc = useQueryClient()

  return useMutation({
    ...featureFlagMutationOptions.save(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: featureFlagKeys.byInstance(instanceId),
      })
    },
  })
}

export function buildSavePayload(
  instanceId: string,
  flags: SaveFeatureFlagPayload["flags"]
): SaveFeatureFlagPayload {
  return {
    instanceId,
    flags,
  }
}
