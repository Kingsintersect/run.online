import { z } from "zod"
import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import { settingsApi, type SafeSetting } from "@/services/configurationApi"
import {
  ActiveGatewayResponseSchema,
  AssignmentHistorySchema,
  CreateGatewayPayloadSchema,
  GatewayAssignmentsSchema,
  GatewayProviderListSchema,
  GatewayTestResultSchema,
  PaymentGatewayListSchema,
  PaymentGatewaySchema,
  UpdateActiveGatewayPayloadSchema,
  UpdateAssignmentPayloadSchema,
  UpdateDefaultGatewayPayloadSchema,
  UpdateGatewayPayloadSchema,
} from "../schemas"
import type {
  ActiveGatewayProvider,
  AssignmentHistoryEntry,
  CreateGatewayPayload,
  GatewayAssignments,
  GatewayProvider,
  GatewayTestResult,
  PaymentGateway,
  UpdateActiveGatewayPayload,
  UpdateAssignmentPayload,
  UpdateDefaultGatewayPayload,
  UpdateGatewayPayload,
} from "../types"
import { FALLBACK_PROVIDER_CATALOG } from "../lib/provider-catalog"
import { providerSettingRows, settingKeyFor } from "../lib/settings-derivation"

// sandbox/payment-routing API_CONTRACTS §1–§3. Every /payments/* route below
// is proposed and not built yet; `/fees/gateway` is the one live route. Reads return null while the route is missing so the
// hooks can fall back (CLAUDE.md §14); writes throw, except gateway
// create/update, which write through the real Settings API while the gateway
// routes are missing — that is where the server reads credentials today.

const AUTH = { access_token: true } as const

/** Laravel's unregistered-route 404, or a 405: the endpoint isn't built yet. */
export function isRouteMissing(error: Error | null): boolean {
  if (!(error instanceof ApiClientError)) return false
  return (
    error.status === 405 ||
    (error.status === 404 &&
      /^The route .+ could not be found/i.test(error.message))
  )
}

const ErrorBodySchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
})

/** 409 GATEWAY_IN_USE from `DELETE /payments/gateways/{id}`. */
export function isGatewayInUse(error: Error | null): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 409) return false
  const body = ErrorBodySchema.safeParse(error.data)
  const code = body.success ? body.data.code : undefined
  return code === "GATEWAY_IN_USE" || /GATEWAY_IN_USE/.test(error.message)
}

async function orNullWhenMissing<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof Error && isRouteMissing(error)) return null
    throw error
  }
}

// ── Settings fallback helpers ───────────────────────────────────────

const SETTINGS_PAGE_SIZE = 100
const MAX_SETTINGS_PAGES = 20

/**
 * Every Settings row whose key starts with a known provider prefix. The list
 * is paginated (default 20), so this pages through it. Rows come back already
 * masked by `toSafeSetting()`.
 */
async function listProviderSettings(
  providers: string[]
): Promise<SafeSetting[]> {
  const prefixes = providers.map((p) => `${p}_`)
  const rows: SafeSetting[] = []
  for (let page = 1; page <= MAX_SETTINGS_PAGES; page++) {
    const res = await settingsApi.list({ page, limit: SETTINGS_PAGE_SIZE })
    rows.push(...res.data)
    const total = res.meta?.total ?? rows.length
    if (res.data.length < SETTINGS_PAGE_SIZE || rows.length >= total) break
  }
  return rows.filter((r) => prefixes.some((p) => r.key.startsWith(p)))
}

/**
 * Writes credentials to the Settings rows the server reads today: PATCH the
 * existing row, or create it with `group = provider`. Blank values are
 * skipped ("keep current").
 */
async function writeCredentialsToSettings(
  provider: string,
  credentials: Record<string, string>
): Promise<void> {
  const settings = await listProviderSettings([provider])
  const rows = providerSettingRows(settings, provider)
  for (const [field, raw] of Object.entries(credentials)) {
    const value = raw.trim()
    if (!value) continue
    const row = rows.get(field)
    if (row) await settingsApi.update(row.id, { value })
    else
      await settingsApi.create({
        key: settingKeyFor(provider, field),
        value,
        group: provider,
      })
  }
}

function withoutBlankCredentials(
  credentials: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!credentials) return undefined
  return Object.fromEntries(
    Object.entries(credentials)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v !== "")
  )
}

// ── Service ─────────────────────────────────────────────────────────

export const paymentGatewaysService = {
  /** §1: provider catalog, or null while the route is missing. */
  listProviders(): Promise<GatewayProvider[] | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: GatewayProvider[] }>(
        "/payments/gateway-providers",
        AUTH
      )
      return GatewayProviderListSchema.parse(res.data)
    })
  },

  /** §2: configured gateways, or null while the route is missing. */
  listGateways(): Promise<PaymentGateway[] | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: PaymentGateway[] }>(
        "/payments/gateways",
        AUTH
      )
      return PaymentGatewayListSchema.parse(res.data)
    })
  },

  /** The fallback's raw material: provider-prefixed Settings rows. */
  listLegacySettings(): Promise<SafeSetting[]> {
    return listProviderSettings(
      FALLBACK_PROVIDER_CATALOG.map((p) => p.provider)
    )
  },

  /**
   * §2 create. While the route is missing, only the credentials can be
   * stored (as Settings rows); display name, environment and enabled have
   * nowhere to live yet. Returns null in that case.
   */
  async createGateway(
    payload: CreateGatewayPayload
  ): Promise<PaymentGateway | null> {
    const body = CreateGatewayPayloadSchema.parse({
      ...payload,
      credentials: withoutBlankCredentials(payload.credentials) ?? {},
    })
    try {
      const res = await apiClient.post<
        { data: PaymentGateway },
        CreateGatewayPayload
      >("/payments/gateways", body, AUTH)
      return PaymentGatewaySchema.parse(res.data)
    } catch (error) {
      if (!(error instanceof Error) || !isRouteMissing(error)) throw error
      await writeCredentialsToSettings(body.provider, body.credentials)
      return null
    }
  },

  /**
   * §2 update. A negative id is a gateway derived from Settings: its
   * credentials are written straight to those rows. Blank secrets are dropped
   * so the server keeps the current value.
   */
  async updateGateway(
    id: number,
    provider: string,
    payload: UpdateGatewayPayload
  ): Promise<PaymentGateway | null> {
    const body = UpdateGatewayPayloadSchema.parse({
      ...payload,
      credentials: withoutBlankCredentials(payload.credentials),
    })
    if (id < 0) {
      await writeCredentialsToSettings(provider, body.credentials ?? {})
      return null
    }
    const res = await apiClient.patch<
      { data: PaymentGateway },
      UpdateGatewayPayload
    >(`/payments/gateways/${id}`, body, AUTH)
    return PaymentGatewaySchema.parse(res.data)
  },

  /** §2 delete. 409 GATEWAY_IN_USE when assigned or holding PENDING payments. */
  async deleteGateway(id: number): Promise<void> {
    await apiClient.delete<void>(`/payments/gateways/${id}`, AUTH)
  },

  /** §2 test connection (no money moves). */
  async testGateway(id: number): Promise<GatewayTestResult> {
    const res = await apiClient.post<{ data: GatewayTestResult }, undefined>(
      `/payments/gateways/${id}/test`,
      undefined,
      AUTH
    )
    return GatewayTestResultSchema.parse(res.data)
  },

  /** §3: current routing, or null while the route is missing. */
  listAssignments(): Promise<GatewayAssignments | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: GatewayAssignments }>(
        "/payments/gateway-assignments",
        AUTH
      )
      return GatewayAssignmentsSchema.parse(res.data)
    })
  },

  async updateAssignment(
    majorProgramId: number,
    payload: UpdateAssignmentPayload
  ): Promise<void> {
    const body = UpdateAssignmentPayloadSchema.parse(payload)
    await apiClient.put<{ data: GatewayAssignments }, UpdateAssignmentPayload>(
      `/payments/gateway-assignments/${majorProgramId}`,
      body,
      AUTH
    )
  },

  async updateDefault(payload: UpdateDefaultGatewayPayload): Promise<void> {
    const body = UpdateDefaultGatewayPayloadSchema.parse(payload)
    await apiClient.put<
      { data: GatewayAssignments },
      UpdateDefaultGatewayPayload
    >("/payments/gateway-assignments/default", body, AUTH)
  },

  /**
   * Live: `GET /fees/gateway`, the institution-wide gateway every NEW payment
   * uses today (bruno/fee/Payments - Active Gateway - Get.bru). Null if the
   * route is missing on this deployment.
   */
  getActiveGateway(): Promise<ActiveGatewayProvider | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: { activeGateway: string } }>(
        "/fees/gateway",
        AUTH
      )
      return ActiveGatewayResponseSchema.parse(res).data.activeGateway
    })
  },

  /**
   * Live: `PATCH /fees/gateway` (super_admin only, 422 on anything but
   * credo/fcmb). Affects new payments only; in-flight payments keep
   * verifying on the gateway they started on.
   */
  async setActiveGateway(
    payload: UpdateActiveGatewayPayload
  ): Promise<ActiveGatewayProvider> {
    const body = UpdateActiveGatewayPayloadSchema.parse(payload)
    const res = await apiClient.patch<
      { data: { activeGateway: string } },
      UpdateActiveGatewayPayload
    >("/fees/gateway", body, AUTH)
    return ActiveGatewayResponseSchema.parse(res).data.activeGateway
  },

  /** §3 history, or null while the route is missing. */
  listHistory(
    majorProgramId?: number
  ): Promise<AssignmentHistoryEntry[] | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: AssignmentHistoryEntry[] }>(
        "/payments/gateway-assignments/history",
        {
          ...AUTH,
          params: majorProgramId === undefined ? undefined : { majorProgramId },
        }
      )
      return AssignmentHistorySchema.parse(res.data)
    })
  },
}
