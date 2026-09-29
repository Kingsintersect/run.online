import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import { FALLBACK_BANKS } from "../lib/fallback-banks"
import {
  ApiErrorBodySchema,
  BankListSchema,
  CreateSettlementAccountSchema,
  ResolveAccountResponseSchema,
  ResolveAccountSchema,
  SettlementAccountListSchema,
  SettlementAccountSchema,
  SplitRuleListSchema,
  SplitRuleSchema,
  UpdateSettlementAccountSchema,
  UpsertSplitRuleSchema,
} from "../schemas"
import type {
  ApiErrorBody,
  Bank,
  CreateSettlementAccount,
  ResolveAccount,
  ResolveAccountResponse,
  SettlementAccount,
  Sourced,
  SplitRule,
  UpdateSettlementAccount,
  UpsertSplitRule,
} from "../types"

// sandbox/payment-routing (shared CONTRACT §4–§5). All endpoints PROPOSED.
// List/read calls return a tagged `{ data, source }` so the hooks expose one
// interface whether the endpoint exists or not (CLAUDE.md §14). Writes are
// never faked: in fallback mode the UI disables Save, and if a write is
// attempted anyway the real error propagates.

const AUTH = { access_token: true } as const
const BASE = "/payments"

/** Laravel's unregistered-route 404, or a 405: the endpoint isn't built yet. */
export function isRouteMissing(error: ApiClientError): boolean {
  return (
    error.status === 405 ||
    (error.status === 404 &&
      /^The route .+ could not be found/i.test(error.message))
  )
}

/** Parsed Laravel error body, or null when the error carries none. */
export function readApiErrorBody(error: Error): ApiErrorBody | null {
  if (!(error instanceof ApiClientError)) return null
  const parsed = ApiErrorBodySchema.safeParse(error.data)
  return parsed.success ? parsed.data : null
}

/** 409 ACCOUNT_IN_SPLIT_RULE on delete (§4). */
export function isAccountInSplitRule(error: Error): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 409) return false
  const body = readApiErrorBody(error)
  return (
    body?.code === "ACCOUNT_IN_SPLIT_RULE" ||
    /ACCOUNT_IN_SPLIT_RULE|split rule/i.test(body?.message ?? error.message)
  )
}

/** Whether an error thrown by a write means the endpoint isn't built yet. */
export function isWriteRouteMissing(error: Error): boolean {
  return error instanceof ApiClientError && isRouteMissing(error)
}

/** First validation message from a 422 body, else the error message. */
export function describeApiError(error: Error, fallback: string): string {
  const body = readApiErrorBody(error)
  const firstFieldError = body?.errors
    ? Object.values(body.errors).flat()[0]
    : undefined
  return firstFieldError ?? body?.message ?? error.message ?? fallback
}

async function withFallback<T>(
  load: () => Promise<T>,
  fallback: T
): Promise<Sourced<T>> {
  try {
    return { data: await load(), source: "live" }
  } catch (error) {
    if (error instanceof ApiClientError && isRouteMissing(error)) {
      return { data: fallback, source: "fallback" }
    }
    throw error
  }
}

export const settlementAccountsService = {
  // ── Banks ─────────────────────────────────────────────────────────────

  listBanks(): Promise<Sourced<Bank[]>> {
    return withFallback(async () => {
      const res = await apiClient.get<{ data: Bank[] }>(`${BASE}/banks`, AUTH)
      return BankListSchema.parse(res.data)
    }, [...FALLBACK_BANKS])
  },

  // ── Settlement accounts ───────────────────────────────────────────────

  listAccounts(majorProgramId: number): Promise<Sourced<SettlementAccount[]>> {
    return withFallback(async () => {
      const res = await apiClient.get<{ data: SettlementAccount[] }>(
        `${BASE}/settlement-accounts`,
        { ...AUTH, params: { majorProgramId } }
      )
      return SettlementAccountListSchema.parse(res.data)
    }, [])
  },

  async createAccount(
    payload: CreateSettlementAccount
  ): Promise<SettlementAccount> {
    const body = CreateSettlementAccountSchema.parse(payload)
    const res = await apiClient.post<
      { data: SettlementAccount },
      CreateSettlementAccount
    >(`${BASE}/settlement-accounts`, body, AUTH)
    return SettlementAccountSchema.parse(res.data)
  },

  async updateAccount(
    id: number,
    payload: UpdateSettlementAccount
  ): Promise<SettlementAccount> {
    const body = UpdateSettlementAccountSchema.parse(payload)
    const res = await apiClient.patch<
      { data: SettlementAccount },
      UpdateSettlementAccount
    >(`${BASE}/settlement-accounts/${id}`, body, AUTH)
    return SettlementAccountSchema.parse(res.data)
  },

  async deleteAccount(id: number): Promise<void> {
    await apiClient.delete<{ data: null }>(
      `${BASE}/settlement-accounts/${id}`,
      AUTH
    )
  },

  async resolveAccount(
    payload: ResolveAccount
  ): Promise<ResolveAccountResponse> {
    const body = ResolveAccountSchema.parse(payload)
    const res = await apiClient.post<
      { data: ResolveAccountResponse },
      ResolveAccount
    >(`${BASE}/settlement-accounts/resolve`, body, AUTH)
    return ResolveAccountResponseSchema.parse(res.data)
  },

  // ── Split rules ───────────────────────────────────────────────────────

  listSplitRules(majorProgramId: number): Promise<Sourced<SplitRule[]>> {
    return withFallback(async () => {
      const res = await apiClient.get<{ data: SplitRule[] }>(
        `${BASE}/split-rules`,
        { ...AUTH, params: { majorProgramId } }
      )
      return SplitRuleListSchema.parse(res.data)
    }, [])
  },

  async upsertSplitRule(payload: UpsertSplitRule): Promise<SplitRule> {
    const body = UpsertSplitRuleSchema.parse(payload)
    const res = await apiClient.put<{ data: SplitRule }, UpsertSplitRule>(
      `${BASE}/split-rules`,
      body,
      AUTH
    )
    return SplitRuleSchema.parse(res.data)
  },

  async deleteSplitRule(id: number): Promise<void> {
    await apiClient.delete<{ data: null }>(`${BASE}/split-rules/${id}`, AUTH)
  },
}
