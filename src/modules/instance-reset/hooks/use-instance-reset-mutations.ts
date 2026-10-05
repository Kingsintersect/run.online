"use client"

import { useCallback, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { instanceResetService } from "../services/instance-reset.service"
import type {
  LockPayload,
  PreviewPayload,
  ResetPreview,
  ResetStatus,
  RunSummary,
  Sourced,
  StartRunPayload,
} from "../types"
import { instanceResetKeys } from "./query-keys"

// The password must never sit in the React Query cache. A mutation's
// `variables` are kept in the MutationCache (and shown in devtools), so the
// password is NOT passed as a variable: `start()`/`lock()` park it in a ref
// for the single call, mutationFn takes it and clears the ref before the
// request goes out. Variables only ever hold the previewId and typed name.

interface MutationHandlers<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

function useInvalidateAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: instanceResetKeys.status() }),
      qc.invalidateQueries({ queryKey: instanceResetKeys.groups() }),
      qc.invalidateQueries({ queryKey: instanceResetKeys.runs() }),
    ])
}

/** POST /preview. The result is server data held by this mutation. */
export function usePreviewReset() {
  return useMutation<ResetPreview, Error, PreviewPayload>({
    mutationFn: (payload) => instanceResetService.preview(payload),
  })
}

export interface UseSecretMutationResult<T> {
  isPending: boolean
  error: Error | null
  data: T | undefined
  reset: () => void
}

/** POST /runs. Invalidates status and runs once the job is accepted. */
export function useStartResetRun() {
  const invalidate = useInvalidateAll()
  const secret = useRef<string | null>(null)
  const m = useMutation<RunSummary, Error, Omit<StartRunPayload, "password">>({
    mutationFn: (v) => {
      const password = secret.current ?? ""
      secret.current = null
      return instanceResetService.startRun({ ...v, password })
    },
    onSettled: () => invalidate(),
    gcTime: 0,
  })
  const { mutate } = m
  const start = useCallback(
    (payload: StartRunPayload, handlers?: MutationHandlers<RunSummary>) => {
      const { password, ...rest } = payload
      secret.current = password
      mutate(rest, handlers)
    },
    [mutate]
  )
  const result: UseSecretMutationResult<RunSummary> = {
    isPending: m.isPending,
    error: m.error,
    data: m.data,
    reset: m.reset,
  }
  return { start, ...result }
}

/** POST /lock (irreversible). Writes the returned status into the cache. */
export function useLockInstance() {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  const secret = useRef<string | null>(null)
  const m = useMutation<ResetStatus, Error, Omit<LockPayload, "password">>({
    mutationFn: (v) => {
      const password = secret.current ?? ""
      secret.current = null
      return instanceResetService.lock({ ...v, password })
    },
    onSuccess: (status) => {
      const next: Sourced<ResetStatus | null> = { source: "live", data: status }
      qc.setQueryData(instanceResetKeys.status(), next)
      return invalidate()
    },
    gcTime: 0,
  })
  const { mutate } = m
  const lock = useCallback(
    (payload: LockPayload, handlers?: MutationHandlers<ResetStatus>) => {
      const { password, ...rest } = payload
      secret.current = password
      mutate(rest, handlers)
    },
    [mutate]
  )
  const result: UseSecretMutationResult<ResetStatus> = {
    isPending: m.isPending,
    error: m.error,
    data: m.data,
    reset: m.reset,
  }
  return { lock, ...result }
}
