import apiClient from "@/lib/clients/apiClient"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import {
  LockPayloadSchema,
  PreviewPayloadSchema,
  ApiResetGroupListSchema,
  ResetPreviewSchema,
  ResetStatusSchema,
  RunDetailSchema,
  RunListSchema,
  RunSummarySchema,
  StartRunPayloadSchema,
} from "../schemas"
import { PLANNED_RESET_GROUPS } from "../lib/reset-catalog"
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

// /api/v1/system/instance-reset (super_admin only). Live on QHUB since
// 2026-10-05 (Bruno instance-reset/*); RUN's collection doesn't carry it, so
// reads still return null while the route is missing (Laravel's "route could
// not be found" 404, or a 405) and the hooks fall back to the planned
// catalogue (CLAUDE.md §14). Writes never fall back: they throw, and the UI
// keeps every destructive control disabled until the reads answer for real.

const BASE = "/system/instance-reset"
const AUTH = { access_token: true } as const

/** Moodle entity labels from the local catalogue, keyed by entity type. */
const MOODLE_LABELS = new Map<string, string>(
  PLANNED_RESET_GROUPS.flatMap((g) =>
    (g.moodle?.entities ?? []).map((e): [string, string] => [e.type, e.label])
  )
)

function moodleLabel(type: string, label: string | null | undefined): string {
  if (label) return label
  const known = MOODLE_LABELS.get(type)
  if (known) return known
  const words = type.replace(/_/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

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
      return ApiResetGroupListSchema.parse(res.data)
        .map(
          (g): ResetGroup => ({
            ...g,
            moodle: g.moodle
              ? {
                  entities: g.moodle.entities.map((e) => ({
                    ...e,
                    label: moodleLabel(e.type, e.label),
                  })),
                }
              : null,
          })
        )
        .sort((a, b) => a.order - b.order)
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
