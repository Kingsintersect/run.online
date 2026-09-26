// Student-facing copy for the session registration page. Labels only — the
// backend decides every outcome, gate and limit; this file just names them.
//
// Outcome and financial-status labels/badges are owned by
// `modules/progression/` (lib/outcome.ts, components/outcome-badge.tsx) and
// imported from there. What stays here is registration-specific: the
// student-voiced outcome explanations and the registration error messages.

import type { StandingOutcome } from "../types"

// Calm, plain-language explanations for outcomes a student may worry about.
export const OUTCOME_EXPLANATION: Partial<Record<StandingOutcome, string>> = {
  PROMOTED_WITH_CARRYOVER:
    "You moved up a level. A few courses from earlier still need to be passed — they're added to your registration below automatically.",
  PROMOTED_ON_PROBATION:
    "You moved up a level, and your CGPA is below the level your programme expects. Probation is a support measure, not a penalty: raise your CGPA this session and it is lifted. Your level adviser can help you plan.",
  SPILLOVER:
    "You've reached the final level but still have a few courses to complete. You'll spend extra time only on those courses, then graduate once they are passed.",
  REPEAT_LEVEL:
    "You'll take this level again to strengthen your results before moving on. Your department can talk you through the plan.",
  WITHHELD:
    "One or more results from last session are on hold. Contact your department to find out what's needed.",
  ADVISED_TO_WITHDRAW:
    "Please speak with your department or level adviser about your options before registering.",
}

// Every registration error code in the shared contract, mapped to a
// specific, friendly message.
export const REGISTRATION_ERROR_MESSAGE: Record<string, string> = {
  OUTSTANDING_DEBT:
    "You have unpaid fees from a previous session. Pay them (or ask the bursary about a waiver) and then register.",
  CREDIT_LOAD_EXCEEDED:
    "That's more credit units than you're allowed this semester. Remove a course and try again.",
  CREDIT_LOAD_BELOW_MINIMUM:
    "You need to register more credit units to meet this semester's minimum. Add a course and try again.",
  PREREQUISITE_NOT_MET:
    "You haven't passed a course this one depends on yet, so it can't be registered.",
  CARRYOVER_NOT_DROPPABLE:
    "Carryover courses must stay on your registration — they can't be removed.",
  CARRYOVER_OFFERING_MISSING:
    "One of your carryover courses isn't being offered this semester. Please contact your department before registering.",
  REGISTRATION_CLOSED:
    "Course registration isn't open right now. Check the registration dates for this semester.",
  STANDING_NOT_ELIGIBLE:
    "Your academic standing doesn't allow registration this semester. Please contact your department.",
}

export function registrationErrorMessage(
  code: string | null | undefined,
  fallback: string
): string {
  return (code && REGISTRATION_ERROR_MESSAGE[code]) || fallback
}

export function formatNaira(value: string | number | null): string {
  const n = typeof value === "string" ? Number(value) : value
  if (n === null || !Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(n)
}
