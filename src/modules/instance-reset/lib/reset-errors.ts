import { ApiClientError } from "@/lib/clients/apiClient"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import { ResetErrorBodySchema } from "../schemas"
import type { ResetErrorCode } from "../types"

// Every error in the instance-reset contract ({ message, code }) mapped to one
// specific message. Components show these next to the step that caused them;
// confirmation/password mismatches land on the matching form field instead.

export interface ResetError {
  status: number | null
  code: ResetErrorCode | null
  message: string
  /** Laravel `errors.*`, first message per key. */
  fieldErrors: Record<string, string>
  /** The preview must be generated again (PREVIEW_EXPIRED / PREVIEW_STALE). */
  needsNewPreview: boolean
  /** The error belongs on a confirmation-form field, not in an alert. */
  field: "confirmation" | "password" | null
}

const KNOWN_CODES: readonly ResetErrorCode[] = [
  "FORBIDDEN",
  "RESET_DISABLED",
  "INSTANCE_LOCKED",
  "RUN_IN_PROGRESS",
  "PREVIEW_EXPIRED",
  "PREVIEW_STALE",
  "CONFIRMATION_MISMATCH",
  "INVALID_PASSWORD",
  "RUN_NOT_FOUND",
]

function isKnownCode(code: string): code is ResetErrorCode {
  return (KNOWN_CODES as readonly string[]).includes(code)
}

const MESSAGES: Record<ResetErrorCode, string> = {
  FORBIDDEN:
    "Only super admin accounts can reset or lock this instance. The server refused this request for your account.",
  RESET_DISABLED:
    "Instance reset is switched off on this server (INSTANCE_RESET_ENABLED isn't set to true). Nothing was changed.",
  INSTANCE_LOCKED:
    "This instance has been marked as live, so it can no longer be reset. Nothing was changed.",
  RUN_IN_PROGRESS:
    "Another reset is already running. Wait for it to finish before starting a new one. Nothing new was started.",
  PREVIEW_EXPIRED:
    "This preview has expired (previews last 10 minutes). Preview again to get fresh row counts, then confirm.",
  PREVIEW_STALE:
    "Row counts changed since this preview was made. Preview again so you confirm exactly what will be deleted.",
  CONFIRMATION_MISMATCH:
    "The institution name doesn't match exactly. Type it again, with the same capitals and spacing.",
  INVALID_PASSWORD: "That password is incorrect.",
  RUN_NOT_FOUND:
    "That reset run doesn't exist on the server. It may have been started on another instance; check the run history below.",
  VALIDATION: "Some of the details sent were rejected by the server.",
  ENDPOINT_MISSING:
    "The reset service isn't available on the server yet. It has been flagged for the backend team; nothing was changed.",
}

/** Parses any error; never throws. */
export function parseResetError(error: Error): ResetError {
  if (isEndpointMissing(error)) {
    return build(error, "ENDPOINT_MISSING", {})
  }
  if (!(error instanceof ApiClientError)) {
    return {
      status: null,
      code: null,
      message: error.message,
      fieldErrors: {},
      needsNewPreview: false,
      field: null,
    }
  }
  const parsed = ResetErrorBodySchema.safeParse(error.data)
  const body = parsed.success ? parsed.data : null
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(body?.errors ?? {})) {
    const first = Array.isArray(value) ? value[0] : value
    if (first) fieldErrors[key] = first
  }
  const raw = body?.code ?? null
  let code: ResetErrorCode | null = raw && isKnownCode(raw) ? raw : null
  if (!code && error.status === 403) code = "FORBIDDEN"
  if (!code && error.status === 422 && Object.keys(fieldErrors).length > 0)
    code = "VALIDATION"
  const result = build(error, code, fieldErrors)
  // Unknown code: keep the server's own wording.
  if (!code) result.message = body?.message ?? error.message
  return result
}

function build(
  error: Error,
  code: ResetErrorCode | null,
  fieldErrors: Record<string, string>
): ResetError {
  const status = error instanceof ApiClientError ? (error.status ?? null) : null
  const fromFields =
    "confirmation" in fieldErrors
      ? "confirmation"
      : "password" in fieldErrors
        ? "password"
        : null
  const field =
    code === "CONFIRMATION_MISMATCH"
      ? "confirmation"
      : code === "INVALID_PASSWORD"
        ? "password"
        : code === "VALIDATION"
          ? fromFields
          : null
  const message =
    code === "VALIDATION"
      ? (Object.values(fieldErrors)[0] ?? MESSAGES.VALIDATION)
      : code
        ? MESSAGES[code]
        : error.message
  return {
    status,
    code,
    message,
    fieldErrors,
    needsNewPreview: code === "PREVIEW_EXPIRED" || code === "PREVIEW_STALE",
    field,
  }
}
