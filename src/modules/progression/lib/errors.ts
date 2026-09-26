import { z } from "zod"
import { ApiClientError } from "@/lib/clients/apiClient"
// Route-missing detection is generic (Laravel's "The route … could not be
// found." 404, or a 405), so it's reused rather than duplicated.
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import { ProgressionErrorBodySchema, ReadinessSchema } from "../schemas"
import type { ProgressionErrorCode, Readiness } from "../types"

export { isEndpointMissing }

/** Friendly copy for the contract's progression error codes. */
export const PROGRESSION_ERROR_MESSAGES: Record<ProgressionErrorCode, string> =
  {
    READINESS_FAILED:
      "The session isn't ready for promotion yet. Resolve the blockers in the checklist, then try again.",
    RUN_NOT_EDITABLE:
      "This run can no longer be changed — it's being processed, committed or discarded. Refresh to see its current status.",
    RUN_NOT_REVERSIBLE:
      "This run can no longer be reversed. Students may already have registered in the new session.",
    OVERRIDE_REASON_REQUIRED: "Every override needs a reason.",
    CONFIRMATION_MISMATCH:
      "The session name you typed doesn't match the target session. Type it exactly as shown.",
  }

const NOT_AVAILABLE_MESSAGE =
  "This feature is awaiting the backend — it has been flagged for the backend team."

export interface ProgressionApiError {
  status: number | null
  code: string | null
  /** Friendly message: the mapped code copy, else the server's message. */
  message: string
  fieldErrors: Record<string, string[]>
  /** The endpoint doesn't exist on the backend yet (CLAUDE.md §14). */
  notAvailable: boolean
  /** Present on a 422 READINESS_FAILED from `POST /promotion-runs`. */
  readiness: Readiness | null
}

function isProgressionCode(code: string): code is ProgressionErrorCode {
  return code in PROGRESSION_ERROR_MESSAGES
}

/** The readiness payload carried by a READINESS_FAILED error, if any. */
export function readinessFromError(error: Error): Readiness | null {
  if (!(error instanceof ApiClientError)) return null
  const nested = z
    .union([
      z.object({ readiness: ReadinessSchema }),
      z.object({ data: ReadinessSchema }),
    ])
    .safeParse(error.data)
  if (nested.success)
    return "readiness" in nested.data ? nested.data.readiness : nested.data.data
  const flat = ReadinessSchema.safeParse(error.data)
  return flat.success ? flat.data : null
}

export function toProgressionApiError(error: Error): ProgressionApiError {
  if (isEndpointMissing(error))
    return {
      status: error instanceof ApiClientError ? (error.status ?? null) : null,
      code: "ENDPOINT_MISSING",
      message: NOT_AVAILABLE_MESSAGE,
      fieldErrors: {},
      notAvailable: true,
      readiness: null,
    }
  if (error instanceof ApiClientError) {
    const body = ProgressionErrorBodySchema.safeParse(error.data)
    const code = body.success ? (body.data.code ?? null) : null
    const serverMessage = body.success ? body.data.message : undefined
    return {
      status: error.status ?? null,
      code,
      message:
        code && isProgressionCode(code)
          ? PROGRESSION_ERROR_MESSAGES[code]
          : (serverMessage ?? error.message),
      fieldErrors: body.success ? (body.data.errors ?? {}) : {},
      notAvailable: false,
      readiness: readinessFromError(error),
    }
  }
  return {
    status: null,
    code: null,
    message: error.message,
    fieldErrors: {},
    notAvailable: false,
    readiness: null,
  }
}

/** First message of a Laravel 422 field error, e.g. `fieldError(e, "reason")`. */
export function fieldError(
  error: ProgressionApiError | null,
  field: string
): string | undefined {
  return error?.fieldErrors[field]?.[0]
}

/** A 404 on a route that exists — e.g. no policy saved yet for a program. */
export function isRecordNotFound(error: Error): boolean {
  return (
    error instanceof ApiClientError &&
    error.status === 404 &&
    !isEndpointMissing(error)
  )
}
