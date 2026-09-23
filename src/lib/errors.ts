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
// Corrected 2026-09-19 against a real live 422 (`POST /auth/users`, creating
// an admin scoped to a major program): the actual body is a flat Laravel-style
// field-validation error —
//   { "majorProgramIds": ["majorProgramIds is required when assigning any
//                          role other than student, applicant, or super_admin."] }
// — not the `{statusCode, error: "MAJOR_PROGRAM_REQUIRED", details}` shape
// this file originally assumed from the design doc's proposal (that shape has
// never actually been observed live). Read directly off `ApiClientError.data`,
// not `.message` (apiClient's generic extraction never finds a `.message` key
// on this body at all, so `err.message` alone is useless here — this needs
// its own check).
type FieldValidationErrorBody = Record<string, string[] | undefined>

/**
 * Returns the first message for a given field in the backend's flat
 * Laravel-style field-validation error body (`{ [field]: ["..."] }`), read
 * directly off `ApiClientError.data` — same shape `majorProgramIds` below
 * was corrected against, not specific to that one field. `null` for any
 * other error shape, so callers fall back to their own generic message the
 * same way `getErrorMessage` already does.
 */
export function getFieldValidationMessage(
  err: unknown,
  field: string
): string | null {
  const data = (err as { data?: unknown } | undefined)?.data as
    | FieldValidationErrorBody
    | undefined
  const messages = data?.[field]
  return Array.isArray(messages) && typeof messages[0] === "string"
    ? messages[0]
    : null
}
