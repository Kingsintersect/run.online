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

// ── System Monitoring (Scheduled Jobs & Logs) ───────────────
// New backend capability, added to bruno 2026-09-17, confirmed live with no
// frontend consumer during the 2026-09-22 bruno-sync audit (see
// sandbox/BACKEND_DEVIATIONS_2026-09-14.md A37 item 4). Both endpoints are
// enforced super_admin-only inside the controller itself (not by route
// middleware/permission grants), confirmed live via a non-super-admin token.
// Shapes below are taken from a real live probe, not just the bruno docs
// block — the two response bodies differ slightly by whether the log file
// exists for the requested day (see the optional fields).

export interface ScheduledJob {
  command: string
  description: string | null
  cronExpression: string
  withoutOverlapping: boolean
  nextRunAt: string
  nextRunHuman: string
}

export interface ScheduledJobsResponse {
  timezone: string
  jobs: ScheduledJob[]
  rawOutputLogEndpoint: string
}

// "laravel" — default app log, ERROR level only in production. "payments" —
// dedicated debug-level channel for the webhook/payment-lifecycle trail
// (config/logging.php), since "laravel" silently drops the Log::info() calls
// that would otherwise carry it. "scheduler" — raw stdout from every
// artisan-scheduled command as it actually runs (ScheduledJob.command),
// proof cron is really calling `php artisan schedule:run` on the box, not
// just that a job is registered.
export type SystemLogChannel = "laravel" | "payments" | "scheduler"

export interface SystemLogsQueryParams {
  // YYYY-MM-DD, defaults to today. Not meaningful for channel="scheduler"
  // (single continuously-appended file, not daily-rotated) — sent regardless,
  // the backend just ignores it for that channel.
  date?: string
  channel?: SystemLogChannel
  // Default 300, capped at 2000.
  lines?: number
  // Case-insensitive substring match across each full multi-line entry
  // (header + stack trace) before tailing.
  search?: string
}

export interface SystemLogsResponse {
  date?: string
  channel: string
  path: string
  exists: boolean
  totalLinesInFile?: number
  truncatedFromBytes?: number | null
  matchedLines: number
  returnedLines?: number
  search?: string | null
  lines: string[]
}

export const systemMonitoringApi = {
  getScheduledJobs: async (): Promise<ScheduledJobsResponse> => {
    return apiClient
      .get<{
        data: ScheduledJobsResponse
      }>("/configuration/scheduled-jobs", AUTH)
      .then((res) => res.data)
  },

  getLogs: async (
    params?: SystemLogsQueryParams
  ): Promise<SystemLogsResponse> => {
    return apiClient
      .get<{ data: SystemLogsResponse }>("/configuration/logs", {
        ...AUTH,
        params: params as Record<string, unknown> | undefined,
      })
      .then((res) => res.data)
  },
}

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
  scheduledJobs: () => [...configurationKeys.all, "scheduled-jobs"] as const,
  logs: (params?: SystemLogsQueryParams) =>
    [...configurationKeys.all, "logs", params ?? {}] as const,
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

  scheduledJobs: () =>
    createApiQueryOptions({
      queryKey: configurationKeys.scheduledJobs(),
      queryFn: () => systemMonitoringApi.getScheduledJobs(),
    }),

  logs: (params?: SystemLogsQueryParams) =>
    createApiQueryOptions({
      queryKey: configurationKeys.logs(params),
      queryFn: () => systemMonitoringApi.getLogs(params),
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
