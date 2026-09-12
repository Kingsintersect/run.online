"use client"

import { useCallback, useMemo, useState } from "react"
import { isUploadActive, type UploadStage } from "@/lib/uploads"

export interface UseUploadProgressReturn {
  /** Bytes-sent percentage, 0–100. */
  percent: number
  stage: UploadStage
  /** True while the submission is in flight — for disabling controls. */
  isActive: boolean
  /** Call immediately before dispatching the request. */
  start: () => void
  /** Pass straight to `apiClient`'s `onUploadProgress` option. */
  handleProgress: (percent: number) => void
  /** Call once the server has responded successfully. */
  succeed: () => void
  /** Call when the request throws. */
  fail: () => void
  /** Return to the idle state, hiding the progress UI. */
  reset: () => void
}

/**
 * Drives the state machine behind `<UploadProgress />` for any request that
 * ships files.
 *
 * Kept global (rather than per-module) because the sequence is identical
 * everywhere — prepare, stream bytes, wait on the server, settle — and only
 * the request being made differs. Modules wire it to their own mutation.
 *
 * The transition to `processing` at 100% is the point of the hook: the browser
 * reports the last byte leaving well before the API replies, so a bar that
 * simply tracked `percent` would sit frozen at 100% looking hung for the whole
 * server-side processing window.
 */
export function useUploadProgress(): UseUploadProgressReturn {
  const [percent, setPercent] = useState(0)
  const [stage, setStage] = useState<UploadStage>("idle")

  const start = useCallback(() => {
    setPercent(0)
    setStage("preparing")
  }, [])

  const handleProgress = useCallback((next: number) => {
    setPercent(next)
    setStage(next >= 100 ? "processing" : "uploading")
  }, [])

  const succeed = useCallback(() => {
    setPercent(100)
    setStage("done")
  }, [])

  const fail = useCallback(() => setStage("error"), [])

  const reset = useCallback(() => {
    setPercent(0)
    setStage("idle")
  }, [])

  return useMemo(
    () => ({
      percent,
      stage,
      isActive: isUploadActive(stage),
      start,
      handleProgress,
      succeed,
      fail,
      reset,
    }),
    [percent, stage, start, handleProgress, succeed, fail, reset]
  )
}
