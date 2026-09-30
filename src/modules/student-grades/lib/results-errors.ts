import { ApiClientError } from "@/lib/clients/apiClient"
import { ApiErrorBodySchema } from "../schemas"

// Laravel's catch-all for an unregistered route:
//   404 {"message": "The route api/v1/results/offerings could not be found."}
// That is distinct from a model/scope 404 on a route that exists (C6: an
// out-of-scope single record also answers 404), so only this message — or a
// 405 on a path registered for another verb — means "not built yet".
const ROUTE_MISSING = /^The route .+ could not be found\.?$/i

export function isEndpointMissing(error: Error): boolean {
  if (!(error instanceof ApiClientError)) return false
  if (error.status === 405) return true
  return error.status === 404 && ROUTE_MISSING.test(error.message)
}

export interface ResultsApiError {
  status: number | null
  code: string | null
  message: string
  fieldErrors: Record<string, string[]>
  /** The endpoint doesn't exist on the backend yet (CLAUDE.md §14). */
  notAvailable: boolean
  /** The offering's semester (or session) is locked — every result write is frozen. */
  semesterLocked: boolean
}

// Every SEMESTER_LOCKED rejection in the Results module (sheet submit /
// approve / reject / reopen, grade approve / reject / publish, adjustments,
// single-row adjust, grade-item mapping, Moodle pull) answers
// 423 { code: "SEMESTER_LOCKED" } since 2026-09-28 (was 409 — the code is
// still honoured on a 409 in case an older deployment answers). One message
// for all of them, so no screen treats it as a generic failure.
export const SEMESTER_LOCKED_MESSAGE =
  "This semester is locked, so its results are frozen: marks can't be pulled, mapped or adjusted, and sheets can't be submitted, approved, reopened or published."

/** A 423, or a SEMESTER_LOCKED code on any status. */
export function isSemesterLocked(status: number | null, code: string | null) {
  return status === 423 || code === "SEMESTER_LOCKED"
}

const NOT_AVAILABLE_MESSAGE =
  "This action isn't available on the server yet — it has been flagged for the backend team."

export function toResultsApiError(error: Error): ResultsApiError {
  if (isEndpointMissing(error))
    return {
      status: error instanceof ApiClientError ? (error.status ?? null) : null,
      code: "ENDPOINT_MISSING",
      message: NOT_AVAILABLE_MESSAGE,
      fieldErrors: {},
      notAvailable: true,
      semesterLocked: false,
    }
  if (error instanceof ApiClientError) {
    const body = ApiErrorBodySchema.safeParse(error.data)
    const status = error.status ?? null
    const code = body.success ? (body.data.code ?? null) : null
    const locked = isSemesterLocked(status, code)
    return {
      status,
      code: locked ? "SEMESTER_LOCKED" : code,
      message: locked
        ? SEMESTER_LOCKED_MESSAGE
        : ((body.success ? body.data.message : undefined) ?? error.message),
      fieldErrors: body.success ? (body.data.errors ?? {}) : {},
      notAvailable: false,
      semesterLocked: locked,
    }
  }
  return {
    status: null,
    code: null,
    message: error.message,
    fieldErrors: {},
    notAvailable: false,
    semesterLocked: false,
  }
}

/** First message of a Laravel 422 field error, e.g. `fieldError(e, "reason")`. */
export function fieldError(
  error: ResultsApiError | null,
  field: string
): string | undefined {
  return error?.fieldErrors[field]?.[0]
}
