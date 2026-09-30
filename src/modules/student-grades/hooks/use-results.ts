"use client"

// Query hooks for the Results-from-Moodle contract (C7). Each resolves to a
// `Live<T>`: `{available: true, data}` from the live endpoint, or
// `{available: false}` while the backend route doesn't exist yet — the
// component renders <NotAvailableNotice> for the latter (CLAUDE.md §14).
// One interface either way: the day the route ships, these start returning
// data with no component change.

import { useEffect, useRef } from "react"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { createApiQueryOptions } from "@/lib/clients/apiClient"
import {
  fetchScopedOfferingIds,
  fetchScopedSheetPage,
} from "../lib/offering-scope"
import { deriveGradeItemSuggestions } from "../lib/grade-item-suggestions"
import { live, resultsApi } from "../services/results.service"
import { resultsKeys } from "./query-keys"
import type {
  AdjustmentQueueFilters,
  GradeItemMapping,
  GradeItemSuggestion,
  OfferingRef,
  ResultSheetSummary,
  PullJobFilters,
  PullJobStatus,
  ResultScopeSelection,
  ResultSheetFilters,
  ResultTerm,
} from "../types"

// ─── Sheets ───────────────────────────────────────────────────────────────────

// With `majorProgramId` set, rows are verified against each offering's real
// owning major program and fall back to a client-side narrowing while the
// server misapplies that filter (lib/offering-scope.ts). Same result shape
// either way.
export function useResultSheets(filters: ResultSheetFilters, enabled = true) {
  const qc = useQueryClient()
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.sheets(filters),
      queryFn: () => live(() => fetchScopedSheetPage(qc, filters)),
    }),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}

// The offering ids a Moodle pull for this selection covers — every matching
// offering, not only the page on screen. `null` selection = nothing to scope.
export function useResultPullScope(selection: ResultScopeSelection | null) {
  const qc = useQueryClient()
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.pullScope(selection ?? { majorProgramId: 0 }),
      queryFn: () =>
        live(() =>
          selection
            ? fetchScopedOfferingIds(qc, selection)
            : Promise.resolve<number[]>([])
        ),
    }),
    enabled: selection != null,
    staleTime: 30 * 1000,
  })
}

export function useResultSheet(offeringId: number) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.sheet(offeringId),
      queryFn: () => live(() => resultsApi.getSheet(offeringId)),
    }),
    enabled: offeringId > 0,
    staleTime: 15 * 1000,
  })
}

export function useGradeItems(offeringId: number, enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.gradeItems(offeringId),
      queryFn: () => live(() => resultsApi.getGradeItems(offeringId)),
    }),
    enabled: enabled && offeringId > 0,
  })
}

/**
 * The same course's most recent earlier offering whose items are all mapped,
 * and its items; null when there isn't one or it can't be read.
 */
async function previousMappedOffering(
  summary: ResultSheetSummary
): Promise<{ offering: OfferingRef; items: GradeItemMapping[] } | null> {
  const page = await resultsApi.listSheets({
    search: summary.courseCode,
    page: 1,
    limit: 50,
  })
  const prev = page.data
    .filter(
      (s) =>
        s.courseId === summary.courseId &&
        s.offeringId !== summary.offeringId &&
        s.semesterId < summary.semesterId &&
        s.unmappedItemCount === 0
    )
    .sort((a, b) => b.semesterId - a.semesterId)[0]
  if (!prev) return null
  return {
    offering: {
      offeringId: prev.offeringId,
      courseCode: prev.courseCode,
      academicSession: prev.academicSession,
      semesterName: prev.semesterName,
    },
    items: await resultsApi.getGradeItems(prev.offeringId),
  }
}

/**
 * Suggested components for a sheet's unmapped grade items
 * (sandbox/automation §5): the live endpoint when it exists, otherwise the
 * same rules applied here to the previous offering and the item names.
 */
export function useGradeItemSuggestions(
  summary: ResultSheetSummary | null,
  enabled = true
) {
  const offeringId = summary?.offeringId ?? 0
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.gradeItemSuggestions(offeringId),
      queryFn: async (): Promise<GradeItemSuggestion[]> => {
        if (!summary) return []
        const fromServer = await live(() =>
          resultsApi.getGradeItemSuggestions(offeringId)
        )
        if (fromServer.available) return fromServer.data
        const items = await resultsApi.getGradeItems(offeringId)
        if (!items.some((i) => i.component === "UNMAPPED")) return []
        // A reader who can't list other sheets still gets the name rules.
        const previous = await previousMappedOffering(summary).catch(() => null)
        return deriveGradeItemSuggestions(items, previous)
      },
    }),
    enabled: enabled && summary != null && offeringId > 0,
    staleTime: 60 * 1000,
  })
}

export function useSheetAdjustments(offeringId: number, enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.adjustments(offeringId),
      queryFn: () => live(() => resultsApi.listSheetAdjustments(offeringId)),
    }),
    enabled: enabled && offeringId > 0,
  })
}

export function useAdjustmentQueue(filters: AdjustmentQueueFilters) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.adjustmentQueue(filters),
      queryFn: () => live(() => resultsApi.listAdjustmentQueue(filters)),
    }),
    placeholderData: keepPreviousData,
  })
}

// ─── Moodle pull ──────────────────────────────────────────────────────────────

const TERMINAL: PullJobStatus[] = ["COMPLETED", "FAILED", "PARTIAL"]

export function isTerminalPull(status: PullJobStatus): boolean {
  return TERMINAL.includes(status)
}

// A terminal job whose finishedAt is this recent still counts as "just
// finished" (covers a pull another tab/user started moments ago).
const FRESH_PULL_MS = 2 * 60 * 1000

interface UsePullJobOptions {
  /** True when this page started `jobId` itself in this session. */
  startedHere?: boolean
}

// Polls every 3 s until the job reaches a terminal status (C7), then
// refreshes everything a pull writes: the offerings list, every sheet /
// grade-items / adjustments entry, the pull-jobs lists and the publish
// preview.
//
// Refresh rule — once per job id, and only for a pull that just happened:
// when the job is terminal AND (we saw it QUEUED/RUNNING, OR this page
// started it, OR its finishedAt is < 2 min old). The backend can finish a
// job before the first poll (QUEUE_CONNECTION=sync), so "saw it running"
// alone misses real pulls; the other two cover that without refreshing on a
// reload that has an old, long-finished `?pullJob=` in the URL.
export function usePullJob(
  jobId: number | null,
  { startedHere = false }: UsePullJobOptions = {}
) {
  const qc = useQueryClient()
  const query = useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.pullJob(jobId ?? 0),
      queryFn: () => live(() => resultsApi.getPullJob(jobId ?? 0)),
    }),
    enabled: jobId != null,
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d?.available) return false
      return isTerminalPull(d.data.status) ? false : 3000
    },
  })

  const job = query.data?.available ? query.data.data : null
  const observedId = job?.id ?? null
  const status = job?.status
  const finishedAt = job?.finishedAt ?? null
  const seenRunning = useRef(new Set<number>())
  const refreshed = useRef(new Set<number>())
  useEffect(() => {
    if (observedId == null || !status) return
    if (!isTerminalPull(status)) {
      seenRunning.current.add(observedId)
      return
    }
    if (refreshed.current.has(observedId)) return
    const finishedMs = finishedAt ? Date.parse(finishedAt) : NaN
    const justFinished =
      Number.isFinite(finishedMs) && Date.now() - finishedMs < FRESH_PULL_MS
    if (!seenRunning.current.has(observedId) && !startedHere && !justFinished)
      return
    refreshed.current.add(observedId)
    void Promise.all([
      qc.invalidateQueries({ queryKey: resultsKeys.sheetsAll() }),
      qc.invalidateQueries({ queryKey: resultsKeys.sheetDetailAll() }),
      qc.invalidateQueries({ queryKey: resultsKeys.gradeItemsAll() }),
      qc.invalidateQueries({ queryKey: resultsKeys.adjustmentsAll() }),
      qc.invalidateQueries({ queryKey: resultsKeys.pullJobsAll() }),
      qc.invalidateQueries({ queryKey: resultsKeys.publishPreviewAll() }),
    ])
  }, [observedId, status, finishedAt, startedHere, qc])

  return query
}

export function usePullJobs(filters: PullJobFilters, enabled = true) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.pullJobs(filters),
      queryFn: () => live(() => resultsApi.listPullJobs(filters)),
    }),
    enabled,
  })
}

// ─── Publishing ───────────────────────────────────────────────────────────────

const NO_TERM: ResultTerm = { kind: "semester", semesterId: 0 }

export function useResultsPublishPreview(
  term: ResultTerm | null,
  majorProgramId: number | null
) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.publishPreview(term ?? NO_TERM, majorProgramId),
      queryFn: () =>
        live(() =>
          resultsApi.getPublishPreview(
            term ?? NO_TERM,
            majorProgramId ?? undefined
          )
        ),
    }),
    enabled: term != null,
  })
}

// ─── Configuration ────────────────────────────────────────────────────────────

// Always resolves with data: falls back to the live `/grading-schemes` list
// inside the service, so there's no "not available" state here.
export function useResultSchemes(majorProgramId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.schemes(majorProgramId),
      queryFn: () => resultsApi.listSchemes(majorProgramId ?? undefined),
    }),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSchemeResolution(programId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.schemeResolution(programId ?? 0),
      queryFn: () => live(() => resultsApi.resolveScheme(programId ?? 0)),
    }),
    enabled: programId != null,
    staleTime: 60 * 1000,
  })
}

export function useResultPolicy(majorProgramId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.policy(majorProgramId ?? 0),
      queryFn: () => live(() => resultsApi.getPolicy(majorProgramId ?? 0)),
    }),
    enabled: majorProgramId != null,
  })
}

// ─── Student ──────────────────────────────────────────────────────────────────

export function useMyResultStatus(semesterId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.resultStatus(semesterId ?? 0),
      queryFn: () => live(() => resultsApi.getResultStatus(semesterId ?? 0)),
    }),
    enabled: semesterId != null,
    staleTime: 60 * 1000,
  })
}

// Always real data: the service falls back to the legacy endpoint (filtered
// to PUBLISHED) until the StudentGrade shape ships.
export function useMyPublishedGrades(studentId: number | null) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.studentGrades(studentId ?? 0),
      queryFn: () => resultsApi.getStudentGrades(studentId ?? 0),
    }),
    enabled: studentId != null,
    staleTime: 2 * 60 * 1000,
  })
}
