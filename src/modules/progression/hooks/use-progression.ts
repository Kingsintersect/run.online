"use client"

// ─── Progression query hooks — index ───────────────────────────────────────
//
// Every hook resolves to `Live<T>`: `{available: true, data}` from the live
// endpoint, or `{available: false, data: null}` while the backend route
// doesn't exist yet (CLAUDE.md §14) — render an honest "awaiting the backend"
// state for the latter, never invented data. One interface either way.
//
// Queries (this file):
//   usePromotionPolicy(majorProgramId)            policy; data null = none saved yet
//   useSemesterRolloverReadiness(semesterId)      rollover checklist for a semester
//   useSessionCloseReadiness(sessionId, targetId) promotion-readiness checklist
//   usePromotionRuns(filters)                     paginated run history
//   usePromotionRun(runId, {poll})                one run; polls while QUEUED/PREVIEWING/COMMITTING
//   usePromotionRunItems(runId, filters)          paginated/filtered/searched run items (keepPreviousData)
//   useStudentSessionStandings(studentId)         admin: a student's standings timeline, newest first
//   useStudentOutstandingCourses(studentId)       admin: a student's derived carryovers
//   useMySessionStandings()                       student: own standings timeline
//   useMyOutstandingCourses()                     student: own carryovers
//
// Mutations (use-progression-mutations.ts):
//   useUpdatePromotionPolicy(majorProgramId)      PUT policy
//   useLockSemester() / useActivateSemester()     semester rollover actions (activate falls back to live PATCH route)
//   useLockSession() / useActivateSession()       session actions (activate falls back to live PATCH route)
//   useCreatePromotionRun()                       start a run (422 READINESS_FAILED → toProgressionApiError(e).readiness)
//   useOverrideRunItem(runId)                     {itemId, payload} single override
//   useBulkOverrideRunItems(runId)                bulk override
//   useRefreshPromotionRun(runId)                 recompute preview
//   useDiscardPromotionRun(runId)                 discard an uncommitted run
//   useCommitPromotionRun(runId)                  commit (typed target-session name)
//   useReversePromotionRun(runId)                 reverse while is_reversible
//   useAddDebtOverride(studentId?)                {standingId, payload}
//   useRemoveDebtOverride(studentId?)             standingId
//
// Errors: `toProgressionApiError(error)` (lib/errors.ts) → {code, message,
// fieldErrors, notAvailable, readiness}. Labels/badges: lib/outcome.ts and
// components/outcome-badge.tsx. Permissions: lib/permissions.ts.

import { useEffect, useRef } from "react"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { createApiQueryOptions } from "@/lib/clients/apiClient"
import { live } from "../lib/live"
import { isRunActive } from "../lib/outcome"
import { progressionApi } from "../services/progression.service"
import { progressionKeys } from "./query-keys"
import { invalidateAfterSettle } from "./invalidation"
import type { PromotionRunFilters, RunItemFilters, RunStatus } from "../types"

// ─── Policy & readiness ───────────────────────────────────────────────────────

export function usePromotionPolicy(majorProgramId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.policy(majorProgramId ?? 0),
      queryFn: () => live(() => progressionApi.getPolicy(majorProgramId ?? 0)),
    }),
    enabled: majorProgramId != null && majorProgramId > 0,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSemesterRolloverReadiness(semesterId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.semesterRollover(semesterId ?? 0),
      queryFn: () =>
        live(() =>
          progressionApi.getSemesterRolloverReadiness(semesterId ?? 0)
        ),
    }),
    enabled: semesterId != null && semesterId > 0,
  })
}

export function useSessionCloseReadiness(
  sessionId: number | null,
  targetSessionId: number | null
) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.sessionClose(sessionId ?? 0, targetSessionId),
      queryFn: () =>
        live(() =>
          progressionApi.getSessionCloseReadiness(
            sessionId ?? 0,
            targetSessionId ?? 0
          )
        ),
    }),
    enabled:
      sessionId != null &&
      sessionId > 0 &&
      targetSessionId != null &&
      targetSessionId > 0,
  })
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export function usePromotionRuns(filters: PromotionRunFilters, enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.runs(filters),
      queryFn: () => live(() => progressionApi.listRuns(filters)),
    }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

interface UsePromotionRunOptions {
  /** Poll while the run's job is active (default true). */
  poll?: boolean
  /** Poll interval in ms (default 3000). */
  intervalMs?: number
}

/**
 * One run. While its status is QUEUED / PREVIEWING / COMMITTING it refetches
 * every `intervalMs`; polling stops once the status settles. When an observed
 * job settles, the slices it wrote are invalidated (items after a preview;
 * standings, outstanding courses and student lists after a commit).
 */
export function usePromotionRun(
  runId: number | null,
  { poll = true, intervalMs = 3000 }: UsePromotionRunOptions = {}
) {
  const qc = useQueryClient()
  const query = useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.run(runId ?? 0),
      queryFn: () => live(() => progressionApi.getRun(runId ?? 0)),
    }),
    enabled: runId != null && runId > 0,
    refetchInterval: (q) => {
      const d = q.state.data
      if (!poll || !d?.available) return false
      return isRunActive(d.data.status) ? intervalMs : false
    },
  })

  const status = query.data?.available ? query.data.data.status : null
  const previous = useRef<RunStatus | null>(null)
  useEffect(() => {
    const was = previous.current
    previous.current = status
    if (runId == null || !status || !was) return
    if (isRunActive(was) && !isRunActive(status))
      void invalidateAfterSettle(qc, runId, status)
  }, [status, runId, qc])

  return query
}

/** Server-side paginated, filtered and searched run items. */
export function usePromotionRunItems(
  runId: number | null,
  filters: RunItemFilters
) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.runItems(runId ?? 0, filters),
      queryFn: () =>
        live(() => progressionApi.listRunItems(runId ?? 0, filters)),
    }),
    enabled: runId != null && runId > 0,
    placeholderData: keepPreviousData,
  })
}

// ─── Standings & outstanding courses ──────────────────────────────────────────

export function useStudentSessionStandings(studentId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.studentStandings(studentId ?? 0),
      queryFn: () =>
        live(() => progressionApi.listStudentStandings(studentId ?? 0)),
    }),
    enabled: studentId != null && studentId > 0,
  })
}

export function useStudentOutstandingCourses(studentId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.studentOutstanding(studentId ?? 0),
      queryFn: () =>
        live(() =>
          progressionApi.listStudentOutstandingCourses(studentId ?? 0)
        ),
    }),
    enabled: studentId != null && studentId > 0,
  })
}

export function useMySessionStandings(enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.myStandings(),
      queryFn: () => live(() => progressionApi.listMyStandings()),
    }),
    enabled,
  })
}

export function useMyOutstandingCourses(enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: progressionKeys.myOutstanding(),
      queryFn: () => live(() => progressionApi.listMyOutstandingCourses()),
    }),
    enabled,
  })
}
