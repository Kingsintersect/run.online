import { z } from "zod"
import { ApiClientError } from "@/lib/clients/apiClient"

// Staff-facing messages for the codes POST /enrollments and POST
// /enrollments/bulk return (bruno/enrollment/Enrollment - Create.bru and
// Enrollment - Bulk Create.bru, 2026-09-28). Every rejection carries
// `{ message, code }`; bulk error rows are `{ offeringId, code, message }`.
// Student-facing wording for the same codes lives in registration-copy.ts.
export const ENROLLMENT_ERROR_MESSAGE: Record<string, string> = {
  ALREADY_ENROLLED: "The student is already enrolled in this offering.",
  STANDING_NOT_ELIGIBLE:
    "The student's status isn't ACTIVE, so they can't be enrolled.",
  COURSE_OUTSIDE_PROGRAM:
    "This course isn't on the student's programme curriculum.",
  OFFERING_NOT_OPEN: "This offering isn't open for enrollment.",
  REGISTRATION_CLOSED:
    "The registration window for this semester isn't open (not started yet, or already closed).",
  OFFERING_FULL: "This offering has reached its capacity.",
  PREREQUISITE_NOT_MET:
    "The student hasn't passed a prerequisite for this course.",
  // Registration-gate codes from the Progression module, unchanged.
  OUTSTANDING_DEBT: "The student has unpaid fees from a previous session.",
  CREDIT_LOAD_EXCEEDED:
    "This would take the student over the maximum credit load for the semester.",
  CREDIT_LOAD_BELOW_MINIMUM:
    "The student's registration would be below the minimum credit load.",
}

export function enrollmentErrorMessage(
  code: string | null | undefined,
  fallback: string
): string {
  return (code && ENROLLMENT_ERROR_MESSAGE[code]) || fallback
}

const ErrorBodySchema = z.object({ code: z.string() })

/** The backend's machine-readable error code from a rejected request, if any. */
export function enrollmentErrorCodeOf(
  error: Error | null | undefined
): string | null {
  if (!(error instanceof ApiClientError)) return null
  const body = ErrorBodySchema.safeParse(error.data)
  return body.success ? body.data.code : null
}

// Shown after a successful enrollment: the backend now also raises any
// missing mandatory invoice for the student (Enrollment - Create.bru,
// "Backend brief item 8"). Fire-and-forget on the server, so worded as
// "will be", not a confirmation.
export const ENROLLMENT_INVOICE_NOTE =
  "Any mandatory fees the student hasn't been invoiced for yet will be billed automatically."
