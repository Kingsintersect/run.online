import {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import apiClient from "@/lib/clients/apiClient"
import type { FeatureFlagMap } from "@/schemas/featureFlags.schema"

const AUTH = { access_token: true }

export type FeatureFlagResponse = {
  flags: FeatureFlagMap
  success?: boolean
}

export type SaveFeatureFlagPayload = {
  instanceId: string
  flags: FeatureFlagMap
}

export const featureFlagApi = {
  get: async (instanceId: string): Promise<FeatureFlagResponse> => {
    return apiClient.get<FeatureFlagResponse>("/portal-settings/features", {
      ...AUTH,
      params: { instanceId },
    })
  },

  save: async (
    payload: SaveFeatureFlagPayload
  ): Promise<FeatureFlagResponse> => {
    return apiClient.post<FeatureFlagResponse, SaveFeatureFlagPayload>(
      "/portal-settings/features",
      payload,
      AUTH
    )
  },
}

export const featureFlagKeys = {
  all: ["feature-flags"] as const,
  byInstance: (instanceId: string) =>
    [...featureFlagKeys.all, instanceId] as const,
}

export const featureFlagQueryOptions = {
  detail: (instanceId: string) =>
    createApiQueryOptions({
      queryKey: featureFlagKeys.byInstance(instanceId),
      queryFn: async () => await featureFlagApi.get(instanceId),
    }),
}

export const featureFlagMutationOptions = {
  save: () =>
    createApiMutationOptions<FeatureFlagResponse, SaveFeatureFlagPayload>({
      mutationKey: [...featureFlagKeys.all, "save"],
      mutationFn: featureFlagApi.save,
    }),
}
