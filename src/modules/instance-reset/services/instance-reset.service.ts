import apiClient from "@/lib/clients/apiClient"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import {
  LockPayloadSchema,
  PreviewPayloadSchema,
  ResetGroupListSchema,
  ResetPreviewSchema,
  ResetStatusSchema,
  RunDetailSchema,
  RunListSchema,
  RunSummarySchema,
  StartRunPayloadSchema,
} from "../schemas"
import type {
  LockPayload,
  PreviewPayload,
  ResetGroup,
  ResetPreview,
  ResetStatus,
  RunDetail,
  RunSummary,
  StartRunPayload,
} from "../types"

// Proposed /api/v1/system/instance-reset (super_admin only). Not built yet.
// Reads return null while the route is missing (Laravel's "route could not be
// found" 404, or a 405) so the hooks can fall back to the planned catalogue
// (CLAUDE.md §14). Writes never fall back: they throw, and the UI keeps every
// destructive control disabled until the reads answer for real.

const BASE = "/system/instance-reset"
const AUTH = { access_token: true } as const

async function orNullWhenMissing<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof Error && isEndpointMissing(error)) return null
    throw error
  }
}

export const instanceResetService = {
  /** GET /status, or null while the route is missing. */
  getStatus(): Promise<ResetStatus | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: ResetStatus }>(
        `${BASE}/status`,
        AUTH
      )
      return ResetStatusSchema.parse(res.data)
    })
  },

  /** GET /groups in display order, or null while the route is missing. */
  listGroups(): Promise<ResetGroup[] | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: ResetGroup[] }>(
        `${BASE}/groups`,
        AUTH
      )
      return ResetGroupListSchema.parse(res.data).sort(
        (a, b) => a.order - b.order
      )
    })
  },

  /** GET /runs newest first, or null while the route is missing. */
  listRuns(): Promise<RunSummary[] | null> {
    return orNullWhenMissing(async () => {
      const res = await apiClient.get<{ data: RunSummary[] }>(
        `${BASE}/runs`,
        AUTH
      )
      return RunListSchema.parse(res.data)
    })
  },

  /** GET /runs/{id}. */
  async getRun(id: string): Promise<RunDetail> {
    const res = await apiClient.get<{ data: RunDetail }>(
      `${BASE}/runs/${encodeURIComponent(id)}`,
      AUTH
    )
    return RunDetailSchema.parse(res.data)
  },

  /** POST /preview: the resolved cascade closure with row counts (10 min). */
  async preview(payload: PreviewPayload): Promise<ResetPreview> {
    const body = PreviewPayloadSchema.parse(payload)
    const res = await apiClient.post<{ data: ResetPreview }, PreviewPayload>(
      `${BASE}/preview`,
      body,
      AUTH
    )
    return ResetPreviewSchema.parse(res.data)
  },

  /**
   * POST /runs (202, async job). The password travels in this body only;
   * nothing here keeps a copy of it.
   */
  async startRun(payload: StartRunPayload): Promise<RunSummary> {
    const body = StartRunPayloadSchema.parse(payload)
    const res = await apiClient.post<{ data: RunSummary }, StartRunPayload>(
      `${BASE}/runs`,
      body,
      AUTH
    )
    return RunSummarySchema.parse(res.data)
  },

  /** POST /lock: one-way "mark instance as live". Returns the new status. */
  async lock(payload: LockPayload): Promise<ResetStatus> {
    const body = LockPayloadSchema.parse(payload)
    const res = await apiClient.post<{ data: ResetStatus }, LockPayload>(
      `${BASE}/lock`,
      body,
      AUTH
    )
    return ResetStatusSchema.parse(res.data)
  },
}
