"use client"

import { useEffect, useRef } from "react"
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"
import type { EnrollmentDriftFilters } from "../types"

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.

export function useEnrollmentDrift(filters: EnrollmentDriftFilters) {
  return useQuery({
    queryKey: moodleSyncKeys.enrollmentDrift(filters),
    queryFn: () => moodleSyncService.listEnrollmentDrift(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  })
}

export function useEnrollmentDriftSummary() {
  return useQuery({
    queryKey: moodleSyncKeys.enrollmentDriftSummary(),
    queryFn: moodleSyncService.getEnrollmentDriftSummary,
    staleTime: 30 * 1000,
  })
}

// Polls every 3s while a scan is RUNNING. When a run finishes, refreshes the
// report and summary so newly found drift appears without a manual reload.
export function useDriftScanStatus() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: moodleSyncKeys.enrollmentDriftScan(),
    queryFn: moodleSyncService.getDriftScanStatus,
    refetchInterval: (q) => (q.state.data?.status === "RUNNING" ? 3000 : false),
  })

  const status = query.data?.status
  const previousStatus = useRef(status)

  useEffect(() => {
    if (
      previousStatus.current === "RUNNING" &&
      status &&
      status !== "RUNNING"
    ) {
      void qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.enrollmentDriftAll(), "list"],
      })
      void qc.invalidateQueries({
        queryKey: moodleSyncKeys.enrollmentDriftSummary(),
      })
    }
    previousStatus.current = status
  }, [status, qc])

  return query
}
