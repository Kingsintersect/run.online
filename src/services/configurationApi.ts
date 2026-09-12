import {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import apiClient from "@/lib/clients/apiClient"
import type {
  Setting,
  CreateSettingPayload,
  UpdateSettingPayload,
  SettingsQueryParams,
  ApiPaginatedResponse,
} from "@/types/school"

const AUTH = { access_token: true }

// Real backend contract per bruno/configuration/*.bru (source of truth — see
// CLAUDE.md §13). List is the only endpoint wrapped in `{data, meta}` — every other
// endpoint here returns its setting FLAT, confirmed by each .bru file's docs block
// ("Returns the flat setting object" / "Response is the flat setting object, not
// wrapped in data") and by Create's post-response script reading `res.body?.id`
// directly, never `res.body?.data?.id`.

export const settingsApi = {
  list: async (
    params?: SettingsQueryParams
  ): Promise<ApiPaginatedResponse<Setting>> => {
    return apiClient.get<ApiPaginatedResponse<Setting>>(
      "/configuration/settings",
      { ...AUTH, params: params as Record<string, unknown> | undefined }
    )
  },

  getById: async (id: number): Promise<Setting> => {
    return apiClient.get<Setting>(`/configuration/settings/${id}`, AUTH)
  },

  getByKey: async (key: string): Promise<Setting> => {
    return apiClient.get<Setting>(`/configuration/settings/key/${key}`, AUTH)
  },

  create: async (payload: CreateSettingPayload): Promise<Setting> => {
    return apiClient.post<Setting, CreateSettingPayload>(
      "/configuration/settings",
      payload,
      AUTH
    )
  },

  update: async (
    id: number,
    payload: UpdateSettingPayload
  ): Promise<Setting> => {
    return apiClient.patch<Setting, UpdateSettingPayload>(
      `/configuration/settings/${id}`,
      payload,
      AUTH
    )
  },

  // 204 No Content — no response body.
  remove: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/configuration/settings/${id}`, AUTH)
  },
}

// ── Query keys ───────────────────────────────

export const configurationKeys = {
  all: ["configuration"] as const,
  settings: () => [...configurationKeys.all, "settings"] as const,
  settingsByGroup: (group: string) =>
    [...configurationKeys.settings(), group] as const,
  settingDetail: (id: number) =>
    [...configurationKeys.settings(), String(id)] as const,
}

// ── Query options ────────────────────────────

export const configurationQueryOptions = {
  settings: (params?: SettingsQueryParams) =>
    createApiQueryOptions({
      queryKey: params?.group
        ? configurationKeys.settingsByGroup(params.group)
        : configurationKeys.settings(),
      queryFn: async () => (await settingsApi.list(params)).data,
    }),

  settingDetail: (id: number) =>
    createApiQueryOptions({
      queryKey: configurationKeys.settingDetail(id),
      queryFn: () => settingsApi.getById(id),
    }),
}

// ── Mutation options ─────────────────────────

export const configurationMutationOptions = {
  create: () =>
    createApiMutationOptions<Setting, CreateSettingPayload>({
      mutationKey: [...configurationKeys.settings(), "create"],
      mutationFn: settingsApi.create,
    }),

  update: () =>
    createApiMutationOptions<
      Setting,
      { id: number; payload: UpdateSettingPayload }
    >({
      mutationKey: [...configurationKeys.settings(), "update"],
      mutationFn: ({ id, payload }) => settingsApi.update(id, payload),
    }),

  remove: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...configurationKeys.settings(), "delete"],
      mutationFn: settingsApi.remove,
    }),
}
