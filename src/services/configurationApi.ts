import {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import apiClient from "@/lib/clients/apiClient"
import { z } from "zod"
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

// ── Secret settings (sandbox/payment-secrets) ─────────────────
// Some settings hold credentials: the payment gateway's secret key first
// (`fcmb_secret_key`), then any other key flagged secret. The proposed
// contract (sandbox/payment-secrets/API_CONTRACTS.md §1) has the server
// return `{ isSecret: true, isSet, maskedValue, value: null }` for these and
// only ever hand out the full value from the password-checked reveal
// endpoint. Since 2026-09-28 (bruno/configuration/Settings - List.bru,
// backend brief item 0) the server masks every key matching
// /secret|password|token|private_key|gateway_key/i on list/show/by-key/
// create/update: `value: null` plus `isSecret`, `isSet`, `maskedValue`. Every
// read below still goes through `toSafeSetting()` as a second line of
// defence: the server's flags win (a null value with `isSet: true` stays
// "set"), and a secret the server didn't mask is masked client-side before it
// can reach the React Query cache, a component, the DOM or the clipboard.

/** Key fragments that mark a setting as secret when the server has no flag. */
// `token` also catches webhook tokens (e.g. `credo_webhook_token`, found in
// plain text on 2026-09-28), which the original screen pattern missed.
const SECRET_KEY_FRAGMENTS = [
  "gateway_key",
  "token",
  "password",
  "secret",
  "private_key",
]

/** Client-side secret detection (fallback for the server's `isSecret`). */
export function isSecretSettingKey(key: string): boolean {
  const k = key.toLowerCase()
  return SECRET_KEY_FRAGMENTS.some((fragment) => k.includes(fragment))
}

const MASK = "••••"
/** Below this length even the last 4 characters give away too much. */
const MIN_LENGTH_FOR_TAIL = 12

/**
 * `sk_live_••••a1b2`: a recognised key prefix (`sk_live_`, `pk_test_`, …),
 * four dots and the last four characters. A short value shows dots only.
 */
export function maskSecretValue(value: string): string {
  if (value.length < MIN_LENGTH_FOR_TAIL) return MASK
  const prefix = /^[a-z]{2,6}_(?:live|test)_/i.exec(value)?.[0] ?? ""
  return `${prefix}${MASK}${value.slice(-4)}`
}

/** A setting as the server may send it: today's plain shape or the masked one. */
type RawSetting = Omit<Setting, "value"> & {
  value: string | null
  isSecret?: boolean
  isSet?: boolean
  maskedValue?: string | null
}

/** A setting as the portal holds it. `value` is always null for a secret. */
export type SafeSetting = Omit<Setting, "value"> & {
  value: string | null
  isSecret: boolean
  /** Whether a secret has a value at all (always true for plain settings). */
  isSet: boolean
  /** The masked value to display for a secret, e.g. `sk_live_••••a1b2`. */
  maskedValue: string | null
}

/**
 * The server's `isSecret: true` always wins. The key heuristic can only add
 * masking, never remove it, so a server that doesn't send the flag yet (or
 * sends `false` for an obviously secret key) never gets a key shown in full.
 */
export function toSafeSetting(raw: RawSetting): SafeSetting {
  const secret = raw.isSecret === true || isSecretSettingKey(raw.key)
  if (!secret) {
    return {
      ...raw,
      value: raw.value ?? "",
      isSecret: false,
      isSet: true,
      maskedValue: null,
    }
  }
  const plain = raw.value ?? ""
  return {
    ...raw,
    value: null,
    isSecret: true,
    isSet: raw.isSet ?? plain !== "",
    maskedValue: raw.maskedValue ?? (plain ? maskSecretValue(plain) : null),
  }
}

export const RevealSecretPayloadSchema = z.object({
  password: z.string().min(1, "Enter your password"),
})
export type RevealSecretPayload = z.infer<typeof RevealSecretPayloadSchema>

const RevealedSecretSchema = z.object({
  key: z.string(),
  value: z.string(),
})
export type RevealedSecret = z.infer<typeof RevealedSecretSchema>

// Real backend contract per bruno/configuration/*.bru (source of truth — see
// CLAUDE.md §13). List is the only endpoint wrapped in `{data, meta}` — every other
// endpoint here returns its setting FLAT, confirmed by each .bru file's docs block
// ("Returns the flat setting object" / "Response is the flat setting object, not
// wrapped in data") and by Create's post-response script reading `res.body?.id`
// directly, never `res.body?.data?.id`.

export const settingsApi = {
  list: async (
    params?: SettingsQueryParams
  ): Promise<ApiPaginatedResponse<SafeSetting>> => {
    const res = await apiClient.get<ApiPaginatedResponse<RawSetting>>(
      "/configuration/settings",
      { ...AUTH, params: params as Record<string, unknown> | undefined }
    )
    return { ...res, data: res.data.map(toSafeSetting) }
  },

  getById: async (id: number): Promise<SafeSetting> => {
    return toSafeSetting(
      await apiClient.get<RawSetting>(`/configuration/settings/${id}`, AUTH)
    )
  },

  getByKey: async (key: string): Promise<SafeSetting> => {
    return toSafeSetting(
      await apiClient.get<RawSetting>(
        `/configuration/settings/key/${key}`,
        AUTH
      )
    )
  },

  create: async (payload: CreateSettingPayload): Promise<SafeSetting> => {
    return toSafeSetting(
      await apiClient.post<RawSetting, CreateSettingPayload>(
        "/configuration/settings",
        payload,
        AUTH
      )
    )
  },

  // For a secret this is the write-only "replace" (sandbox/payment-secrets
  // API_CONTRACTS §2): the new value goes up, only the mask comes back.
  update: async (
    id: number,
    payload: UpdateSettingPayload
  ): Promise<SafeSetting> => {
    return toSafeSetting(
      await apiClient.patch<RawSetting, UpdateSettingPayload>(
        `/configuration/settings/${id}`,
        payload,
        AUTH
      )
    )
  },

  // 204 No Content — no response body.
  remove: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/configuration/settings/${id}`, AUTH)
  },

  /**
   * Proposed (sandbox/payment-secrets API_CONTRACTS §3): super admin only,
   * re-checks the caller's own password, returns the full value in this
   * response only. `skipAuthRefresh`: a 401 here can mean a wrong password
   * rather than an expired token, so it must not trigger a token refresh.
   */
  revealSecret: async (
    id: number,
    payload: RevealSecretPayload
  ): Promise<RevealedSecret> => {
    const body = RevealSecretPayloadSchema.parse(payload)
    const res = await apiClient.post<
      { data: RevealedSecret },
      RevealSecretPayload
    >(`/configuration/settings/${id}/reveal`, body, {
      ...AUTH,
      skipAuthRefresh: true,
    })
    return RevealedSecretSchema.parse(res.data)
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
    createApiMutationOptions<SafeSetting, CreateSettingPayload>({
      mutationKey: [...configurationKeys.settings(), "create"],
      mutationFn: settingsApi.create,
    }),

  update: () =>
    createApiMutationOptions<
      SafeSetting,
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

  // No mutationKey on purpose; see useRevealSecretSetting() for why the
  // result must not linger in the mutation cache.
  revealSecret: () =>
    createApiMutationOptions<
      RevealedSecret,
      { id: number; payload: RevealSecretPayload }
    >({
      mutationFn: ({ id, payload }) => settingsApi.revealSecret(id, payload),
    }),
}
