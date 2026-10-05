import apiClient, { ApiClientError } from "@/lib/clients/apiClient"
import { FALLBACK_BANKS } from "../lib/fallback-banks"
import { isRouteMissing } from "../lib/settlement-errors"
import {
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

// bruno/payment-routing (live on QHUB as of 2026-10-05; may still 404 on a
// backend that hasn't migrated). List/read calls return a tagged `{ data, source }` so the hooks expose one
// interface whether the endpoint exists or not (CLAUDE.md §14). Writes are
// never faked: in fallback mode the UI disables Save, and if a write is
// attempted anyway the real error propagates. Error → message mapping lives
// in ../lib/settlement-errors.ts.

const AUTH = { access_token: true } as const
const BASE = "/payments"

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

  /**
   * bruno/payment-routing/Settlement Accounts - Retry Provisioning.bru:
   * re-runs subaccount provisioning for PENDING/FAILED gateway links only
   * (LINKED ones are untouched) and returns the refreshed account.
   */
  async retryProvisioning(id: number): Promise<SettlementAccount> {
    const res = await apiClient.post<{ data: SettlementAccount }, undefined>(
      `${BASE}/settlement-accounts/${id}/retry-provisioning`,
      undefined,
      AUTH
    )
    return SettlementAccountSchema.parse(res.data)
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
