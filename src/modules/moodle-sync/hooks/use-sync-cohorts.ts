"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"
import type { PushCohortDto } from "../types"

// Multi-Program Platform — sandbox/multi-program-platform/. Not yet shipped
// by the backend (API_CONTRACTS.md §C); retry:false so an unshipped
// endpoint degrades to an empty list rather than retrying a 404.
export function useSyncCohorts() {
  return useQuery({
    queryKey: moodleSyncKeys.cohorts(),
    queryFn: moodleSyncService.listCohorts,
    staleTime: 60 * 1000,
    retry: false,
  })
}

export function usePushCohort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: PushCohortDto) => moodleSyncService.pushCohort(dto),
    onSuccess: () => {
      toast.success("Cohort synced to Moodle")
      qc.invalidateQueries({ queryKey: moodleSyncKeys.cohorts() })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to push cohort"),
  })
}

export function useSyncCohortMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => moodleSyncService.syncCohortMembers(id),
    onSuccess: (result) => {
      toast.success(
        `${result.added} added, ${result.removed} removed, ${result.unchanged} unchanged`
      )
      qc.invalidateQueries({ queryKey: moodleSyncKeys.cohorts() })
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Failed to sync cohort members"
      ),
  })
}
