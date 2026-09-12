import {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import apiClient from "@/lib/clients/apiClient"
import type {
  FeatureRegistryRecord,
  UpsertFeatureRegistryPayload,
} from "@/schemas/featureRegistry.schema"

const AUTH = { access_token: true }

export type FeatureRegistryListResponse = {
  registry: FeatureRegistryRecord[]
}

export type UpsertFeatureRegistryResponse = {
  success: boolean
  registry: FeatureRegistryRecord
}

export type DeleteFeatureRegistryResponse = {
  success: boolean
  message: string
}

export const featureRegistryApi = {
  list: async (): Promise<FeatureRegistryListResponse> => {
    return apiClient.get<FeatureRegistryListResponse>(
      "/portal-settings/registry",
      AUTH
    )
  },

  upsert: async (
    payload: UpsertFeatureRegistryPayload
  ): Promise<UpsertFeatureRegistryResponse> => {
    return apiClient.post<
      UpsertFeatureRegistryResponse,
      UpsertFeatureRegistryPayload
    >("/portal-settings/registry", payload, AUTH)
  },

  remove: async (key: string): Promise<DeleteFeatureRegistryResponse> => {
    return apiClient.delete<DeleteFeatureRegistryResponse>(
      `/portal-settings/registry/${encodeURIComponent(key)}`,
      AUTH
    )
  },
}

export const featureRegistryKeys = {
  all: ["feature-registry"] as const,
  list: () => [...featureRegistryKeys.all, "list"] as const,
}

export const featureRegistryQueryOptions = {
  list: () =>
    createApiQueryOptions({
      queryKey: featureRegistryKeys.list(),
      queryFn: async () => (await featureRegistryApi.list()).registry,
    }),
}

export const featureRegistryMutationOptions = {
  upsert: () =>
    createApiMutationOptions<
      UpsertFeatureRegistryResponse,
      UpsertFeatureRegistryPayload
    >({
      mutationKey: [...featureRegistryKeys.all, "upsert"],
      mutationFn: featureRegistryApi.upsert,
    }),

  remove: () =>
    createApiMutationOptions<DeleteFeatureRegistryResponse, string>({
      mutationKey: [...featureRegistryKeys.all, "remove"],
      mutationFn: featureRegistryApi.remove,
    }),
}
