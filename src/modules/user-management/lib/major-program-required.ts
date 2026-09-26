import { ApiClientError } from "@/lib/clients/apiClient"

interface ValidationBody {
  message?: string
  errors?: Record<string, string[] | string>
}

function isValidationBody(value: object): value is ValidationBody {
  return "message" in value || "errors" in value
}

// True when a create was rejected only because the backend still requires a
// major program for this role. Tutors, deans and HODs teach or lead across
// major programs, so the forms no longer ask for one up front; they ask only
// when the server insists (sandbox/cross-program-teaching). Once the backend
// drops the requirement this never matches and the field never shows.
export function isMajorProgramRequiredError(error: Error): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 422) return false
  const body = error.data
  if (body == null || typeof body !== "object" || !isValidationBody(body))
    return false
  const keys = Object.keys(body.errors ?? {})
  if (keys.some((k) => /major_?program/i.test(k))) return true
  return /major\s*program/i.test(body.message ?? "")
}
