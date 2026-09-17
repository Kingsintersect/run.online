// Major-Program Scoping — sandbox/major-program-scoping/. The backend now
// enforces scope on write/action endpoints (not just list/detail) and
// returns a flat `{ message: "OUT_OF_SCOPE: ..." }` 403 body — no `error`
// code or `details` to branch on, just a string prefix. Substituting a
// friendly message here keeps that raw backend string out of user-facing
// toasts everywhere the existing `err instanceof Error ? err.message :
// fallback` convention is used.
const SCOPE_ERROR_PREFIX = "OUT_OF_SCOPE"
const SCOPE_ERROR_MESSAGE =
  "This record is outside your assigned major program."

/**
 * Substitutes the backend's raw `OUT_OF_SCOPE: ...` marker for a friendly
 * message; returns any other message unchanged. Shared so every call site
 * that extracts an error message its own way (a plain `err.message` read, or
 * a richer helper like `describeApiError` in useUsersData.ts) applies the
 * same substitution instead of each hardcoding the friendly string itself.
 */
export function friendlyMessage(message: string): string {
  return message.startsWith(SCOPE_ERROR_PREFIX) ? SCOPE_ERROR_MESSAGE : message
}

/**
 * Drop-in replacement for the `err instanceof Error ? err.message :
 * fallback` pattern used at every mutation's `onError` in this codebase —
 * same behavior, plus the scope-enforcement substitution above.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return friendlyMessage(err.message)
  return fallback
}

// Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md §5.
// Unlike OUT_OF_SCOPE above (a raw string prefix), this is a structured 422
// body: `{ statusCode: 422, error: "MAJOR_PROGRAM_REQUIRED", message, details:
// { roleId, roleName } }`, returned when POST /auth/users is asked to create
// one of the seven scoped roles (Tutor/Admin/Dean/Director/HOD/Bursary/Staff)
// without a `majorProgramId`. Read off `ApiClientError.data`, not `.message`,
// so it needs its own check rather than reusing `friendlyMessage`'s
// string-prefix substitution.
const MAJOR_PROGRAM_REQUIRED_ERROR = "MAJOR_PROGRAM_REQUIRED"

type MajorProgramRequiredErrorBody = {
  error?: string
  message?: string
  details?: { roleId?: number; roleName?: string }
}

/**
 * Returns a specific, readable message when `err` is the backend's
 * `MAJOR_PROGRAM_REQUIRED` 422 (see above), or `null` for any other error so
 * callers fall back to their own generic message the same way
 * `getErrorMessage` already does.
 */
export function getMajorProgramRequiredMessage(err: unknown): string | null {
  const data = (err as { data?: unknown } | undefined)?.data as
    | MajorProgramRequiredErrorBody
    | undefined
  if (data?.error !== MAJOR_PROGRAM_REQUIRED_ERROR) return null

  const roleName = data.details?.roleName
  return roleName
    ? `A major program is required to create a ${roleName} account.`
    : (data.message ?? "A major program is required for this role.")
}
