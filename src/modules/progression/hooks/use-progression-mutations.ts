"use client"

// Progression mutations (see the index at the top of use-progression.ts).
// Nothing is optimistic: the UI changes only after the server confirms, then
// the affected slices are invalidated via `progressionKeys`. Payloads are
// Zod-validated in the service before dispatch. Errors are ApiClientErrors —
// read them with `toProgressionApiError()`.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { progressionApi } from "../services/progression.service"
import { progressionKeys } from "./query-keys"
import {
  invalidateCalendar,
  invalidateRun,
  invalidateStandingsWide,
} from "./invalidation"
import type {
  BulkOverridePayload,
  CommitRunPayload,
  CreatePromotionRunPayload,
  DebtOverridePayload,
  OverrideRunItemPayload,
  PromotionPolicyPayload,
  ReversePayload,
} from "../types"

// ─── Policy ───────────────────────────────────────────────────────────────────

export function useUpdatePromotionPolicy(majorProgramId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PromotionPolicyPayload) =>
      progressionApi.updatePolicy(majorProgramId, payload),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({
          queryKey: progressionKeys.policy(majorProgramId),
        }),
        // `require_published_results_before_next_semester` changes readiness.
        qc.invalidateQueries({ queryKey: progressionKeys.readinessAll() }),
      ]),
  })
}

// ─── Semester & session calendar ──────────────────────────────────────────────

export function useLockSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (semesterId: number) => progressionApi.lockSemester(semesterId),
    onSuccess: () => invalidateCalendar(qc),
  })
}

export function useActivateSemester() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (semesterId: number) =>
      progressionApi.activateSemester(semesterId),
    onSuccess: () => invalidateCalendar(qc),
  })
}

export function useLockSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => progressionApi.lockSession(sessionId),
    onSuccess: () => invalidateCalendar(qc),
  })
}

export function useActivateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) =>
      progressionApi.activateSession(sessionId),
    onSuccess: () => invalidateCalendar(qc),
  })
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

/** Resolves to the new run (navigate to `/…/promotion-runs/${run.id}`). */
export function useCreatePromotionRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePromotionRunPayload) =>
      progressionApi.createRun(payload),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: progressionKeys.runsAll() }),
        qc.invalidateQueries({ queryKey: progressionKeys.readinessAll() }),
      ]),
  })
}

export function useOverrideRunItem(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { itemId: number; payload: OverrideRunItemPayload }) =>
      progressionApi.overrideRunItem(runId, v.itemId, v.payload),
    onSuccess: () => invalidateRun(qc, runId),
  })
}

export function useBulkOverrideRunItems(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkOverridePayload) =>
      progressionApi.bulkOverride(runId, payload),
    onSuccess: () => invalidateRun(qc, runId),
  })
}

export function useRefreshPromotionRun(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => progressionApi.refreshRun(runId),
    onSuccess: () => invalidateRun(qc, runId),
  })
}

export function useDiscardPromotionRun(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => progressionApi.discardRun(runId),
    onSuccess: () =>
      Promise.all([
        invalidateRun(qc, runId),
        qc.invalidateQueries({ queryKey: progressionKeys.readinessAll() }),
      ]),
  })
}

// Commit/reverse are queued jobs: the run moves to COMMITTING, and
// usePromotionRun re-invalidates standings once it settles. Invalidating here
// too covers a synchronous queue that finishes before the first poll.
export function useCommitPromotionRun(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CommitRunPayload) =>
      progressionApi.commitRun(runId, payload),
    onSuccess: () =>
      Promise.all([invalidateRun(qc, runId), invalidateStandingsWide(qc)]),
  })
}

export function useReversePromotionRun(runId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReversePayload) =>
      progressionApi.reverseRun(runId, payload),
    onSuccess: () =>
      Promise.all([invalidateRun(qc, runId), invalidateStandingsWide(qc)]),
  })
}

// ─── Debt override ────────────────────────────────────────────────────────────

function useInvalidateStandings(studentId?: number) {
  const qc = useQueryClient()
  return () =>
    qc.invalidateQueries({
      queryKey:
        studentId != null
          ? progressionKeys.studentStandings(studentId)
          : progressionKeys.standingsAll(),
    })
}

export function useAddDebtOverride(studentId?: number) {
  const invalidate = useInvalidateStandings(studentId)
  return useMutation({
    mutationFn: (v: { standingId: number; payload: DebtOverridePayload }) =>
      progressionApi.addDebtOverride(v.standingId, v.payload),
    onSuccess: invalidate,
  })
}

export function useRemoveDebtOverride(studentId?: number) {
  const invalidate = useInvalidateStandings(studentId)
  return useMutation({
    mutationFn: (standingId: number) =>
      progressionApi.removeDebtOverride(standingId),
    onSuccess: invalidate,
  })
}
