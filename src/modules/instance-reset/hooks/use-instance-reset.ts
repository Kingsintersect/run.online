"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiClientError } from "@/lib/clients/apiClient"
import { instanceResetService } from "../services/instance-reset.service"
import { PLANNED_RESET_GROUPS } from "../lib/reset-catalog"
import type {
  DataSource,
  PlannedResetGroup,
  ResetGroup,
  ResetStatus,
  RunDetail,
  RunStatus,
  RunSummary,
  Sourced,
} from "../types"
import { instanceResetKeys } from "./query-keys"

// Each hook prefers the live /system/instance-reset route and falls back when
// it isn't built yet (CLAUDE.md §14). Components get one interface with a
// `source` flag and never call anything different per mode; the day the
// backend ships, `source` flips to "live" with no component change.

const STALE = 30 * 1000
const RUN_POLL_MS = 2000
const ACTIVE_STATUS_POLL_MS = 5000

/** A refused or failing request won't change on retry; a network blip may. */
function retryUnlessClientError(failureCount: number, error: Error): boolean {
  if (
    error instanceof ApiClientError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500
  )
    return false
  return failureCount < 2
}

export function isRunActive(status: RunStatus | undefined | null): boolean {
  return status === "queued" || status === "running"
}

interface QueryState {
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/** Planned catalogue in the API shape, every count unknown (null). */
function plannedToGroup(g: PlannedResetGroup): ResetGroup {
  return {
    ...g,
    tables: g.tables.map((t) => ({ ...t, rowCount: null })),
    moodle: g.moodle
      ? { entities: g.moodle.entities.map((e) => ({ ...e, count: null })) }
      : null,
    totalRows: null,
  }
}

// ── Status ──────────────────────────────────────────────────────────

export interface UseResetStatusResult extends QueryState {
  /** Null in planned mode or before the first answer. */
  status: ResetStatus | null
  source: DataSource
}

/** GET /status. Polls while a run is queued or running. */
export function useResetStatus(): UseResetStatusResult {
  const q = useQuery({
    queryKey: instanceResetKeys.status(),
    queryFn: async (): Promise<Sourced<ResetStatus | null>> => {
      const live = await instanceResetService.getStatus()
      return live
        ? { source: "live", data: live }
        : { source: "planned", data: null }
    },
    staleTime: STALE,
    retry: retryUnlessClientError,
    refetchInterval: (query) =>
      isRunActive(query.state.data?.data?.activeRun?.status)
        ? ACTIVE_STATUS_POLL_MS
        : false,
  })
  return {
    status: q.data?.data ?? null,
    source: q.data?.source ?? "planned",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

// ── Groups ──────────────────────────────────────────────────────────

export interface UseResetGroupsResult extends QueryState {
  groups: ResetGroup[]
  source: DataSource
  /** key → label, for resolving cascadesTo / resolvedGroups. */
  labelFor: (key: string) => string
}

/**
 * GET /groups. Planned mode: the local catalogue (lib/reset-catalog.ts) with
 * every count null; never invented numbers.
 */
export function useResetGroups(): UseResetGroupsResult {
  const q = useQuery({
    queryKey: instanceResetKeys.groups(),
    queryFn: async (): Promise<Sourced<ResetGroup[]>> => {
      const live = await instanceResetService.listGroups()
      return live
        ? { source: "live", data: live }
        : { source: "planned", data: PLANNED_RESET_GROUPS.map(plannedToGroup) }
    },
    staleTime: STALE,
    retry: retryUnlessClientError,
  })
  const groups = useMemo(() => q.data?.data ?? [], [q.data])
  const labelFor = useMemo(() => {
    const labels = new Map<string, string>()
    // Planned labels first so a key the live list doesn't carry still reads.
    for (const g of PLANNED_RESET_GROUPS) labels.set(g.key, g.label)
    for (const g of groups) labels.set(g.key, g.label)
    return (key: string) => labels.get(key) ?? key
  }, [groups])
  return {
    groups,
    source: q.data?.source ?? "planned",
    labelFor,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

// ── Availability (shared disabled reason) ───────────────────────────

export interface ResetAvailability {
  /** Preview / run allowed. */
  canReset: boolean
  /** Mark-as-live allowed. */
  canLock: boolean
  /** Why reset is blocked, shown next to every destructive control. */
  resetBlockedReason: string | null
  lockBlockedReason: string | null
  status: ResetStatus | null
  source: DataSource
  isLoading: boolean
  /** Re-reads GET /status (e.g. for a fresh institution name). */
  refetchStatus: () => void
}

function formatWhen(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : ` on ${d.toLocaleString()}`
}

/**
 * One place that decides whether destructive controls are usable. Disabled
 * while loading, on any status error, in planned mode, when the env flag is
 * off, when the instance is locked, or while a run is in progress. The
 * server enforces all of this too; this only avoids dead-end clicks.
 */
export function useResetAvailability(): ResetAvailability {
  const statusQ = useResetStatus()
  const groupsQ = useResetGroups()
  const { status } = statusQ
  const planned = statusQ.source === "planned" || groupsQ.source === "planned"

  let reason: string | null = null
  let lockReason: string | null = null
  if (statusQ.isLoading || groupsQ.isLoading) {
    reason = lockReason = "Checking the reset service…"
  } else if (statusQ.isError || groupsQ.isError) {
    reason = lockReason =
      "The reset status couldn't be loaded, so destructive actions stay off."
  } else if (planned || !status) {
    reason = lockReason =
      "The reset service isn't available on the server yet, so nothing can be cleared or locked from here."
  } else if (status.locked) {
    reason = `This instance was marked as live${formatWhen(status.lockedAt)}${status.lockedBy ? ` by ${status.lockedBy.name}` : ""}; it can never be reset.`
    lockReason = "This instance is already marked as live."
  } else if (!status.enabled) {
    reason = lockReason =
      "Reset is switched off on this server (INSTANCE_RESET_ENABLED isn't true)."
  } else if (isRunActive(status.activeRun?.status)) {
    reason = lockReason =
      "A reset is in progress. Wait for it to finish before starting another."
  }

  return {
    canReset: reason === null,
    canLock: lockReason === null,
    resetBlockedReason: reason,
    lockBlockedReason: lockReason,
    status,
    source: planned ? "planned" : "live",
    isLoading: statusQ.isLoading || groupsQ.isLoading,
    refetchStatus: statusQ.refetch,
  }
}

// ── Runs ────────────────────────────────────────────────────────────

export interface UseResetRunsResult extends QueryState {
  runs: RunSummary[]
  source: DataSource
}

/** GET /runs newest first; empty in planned mode. */
export function useResetRuns(): UseResetRunsResult {
  const q = useQuery({
    queryKey: instanceResetKeys.runs(),
    queryFn: async (): Promise<Sourced<RunSummary[]>> => {
      const live = await instanceResetService.listRuns()
      return live
        ? { source: "live", data: live }
        : { source: "planned", data: [] }
    },
    staleTime: STALE,
    retry: retryUnlessClientError,
  })
  return {
    runs: q.data?.data ?? [],
    source: q.data?.source ?? "planned",
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}

export interface UseResetRunResult extends QueryState {
  run: RunDetail | null
  isActive: boolean
}

/**
 * GET /runs/{id}. Polls every ~2s while queued/running and stops once the
 * run finishes (or the request fails). When a run reaches a final state,
 * status, groups and runs are invalidated once so counts and banners refresh.
 */
export function useResetRun(id: string | null): UseResetRunResult {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: instanceResetKeys.run(id ?? ""),
    queryFn: () => instanceResetService.getRun(id ?? ""),
    enabled: id !== null,
    retry: retryUnlessClientError,
    refetchInterval: (query) => {
      if (query.state.status === "error") return false
      const s = query.state.data?.status
      return s === undefined || isRunActive(s) ? RUN_POLL_MS : false
    },
  })

  const finishedFor = useRef<string | null>(null)
  const runStatus = q.data?.status
  useEffect(() => {
    if (!id || !runStatus || isRunActive(runStatus)) return
    if (finishedFor.current === id) return
    finishedFor.current = id
    void Promise.all([
      qc.invalidateQueries({ queryKey: instanceResetKeys.status() }),
      qc.invalidateQueries({ queryKey: instanceResetKeys.groups() }),
      qc.invalidateQueries({ queryKey: instanceResetKeys.runs(), exact: true }),
    ])
  }, [id, runStatus, qc])

  return {
    run: q.data ?? null,
    isActive: isRunActive(runStatus),
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: () => void q.refetch(),
  }
}
