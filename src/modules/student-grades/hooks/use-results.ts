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
import { live, resultsApi } from "../services/results.service"
import { resultsKeys } from "./query-keys"
import type {
  AdjustmentQueueFilters,
  PullJobFilters,
  PullJobStatus,
  ResultSheetFilters,
} from "../types"

// ─── Sheets ───────────────────────────────────────────────────────────────────

export function useResultSheets(filters: ResultSheetFilters) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.sheets(filters),
      queryFn: () => live(() => resultsApi.listSheets(filters)),
    }),
    placeholderData: keepPreviousData,
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

// Polls every 3 s until the job reaches a terminal status (C7). On the
// running → terminal transition it refreshes the offerings list, the same
// pattern as moodle-sync's useDriftScanStatus.
export function usePullJob(jobId: number | null) {
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

  const status = query.data?.available ? query.data.data.status : undefined
  const previous = useRef(status)
  useEffect(() => {
    if (
      previous.current &&
      !isTerminalPull(previous.current) &&
      status &&
      isTerminalPull(status)
    ) {
      void qc.invalidateQueries({ queryKey: resultsKeys.sheetsAll() })
    }
    previous.current = status
  }, [status, qc])

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

export function useResultsPublishPreview(
  semesterId: number | null,
  majorProgramId: number | null
) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: resultsKeys.publishPreview(semesterId ?? 0, majorProgramId),
      queryFn: () =>
        live(() =>
          resultsApi.getPublishPreview(
            semesterId ?? 0,
            majorProgramId ?? undefined
          )
        ),
    }),
    enabled: semesterId != null,
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
