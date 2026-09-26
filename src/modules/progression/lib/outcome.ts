// Labels and badge styles for every progression enum, defined ONCE here and
// reused by every screen (<OutcomeBadge>, <RunStatusBadge>, filters, cards).
// Class strings are Tailwind utilities with `dark:` variants, to be merged
// with `cn()` onto the ShadCN <Badge variant="outline">.

import type {
  FinancialStatus,
  ReadinessBlockerCode,
  RegistrationStatus,
  RunExceptionCode,
  RunStatus,
  StandingOutcome,
  StandingState,
} from "../types"
import { READINESS_BLOCKER_CODES, RUN_EXCEPTION_CODES } from "../schemas"

// ─── Standing outcome ─────────────────────────────────────────────────────────

export const OUTCOME_LABELS: Record<StandingOutcome, string> = {
  PENDING: "Pending",
  PROMOTED: "Promoted",
  PROMOTED_WITH_CARRYOVER: "Promoted with carryover",
  PROMOTED_ON_PROBATION: "Promoted on probation",
  REPEAT_LEVEL: "Repeat level",
  SPILLOVER: "Spillover",
  GRADUATING: "Graduating",
  ADVISED_TO_WITHDRAW: "Advised to withdraw",
  NOT_EVALUATED: "Not evaluated",
  WITHHELD: "Withheld",
}

export const OUTCOME_BADGE_CLASSES: Record<StandingOutcome, string> = {
  PENDING:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  PROMOTED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  PROMOTED_WITH_CARRYOVER:
    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
  PROMOTED_ON_PROBATION:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  REPEAT_LEVEL:
    "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  SPILLOVER:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  GRADUATING:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  ADVISED_TO_WITHDRAW:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  NOT_EVALUATED:
    "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400",
  WITHHELD:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
}

/** Plain-language explanations, e.g. for the student standing card. */
export const OUTCOME_DESCRIPTIONS: Record<StandingOutcome, string> = {
  PENDING: "The session is still in progress; no decision has been made yet.",
  PROMOTED: "Passed all required courses and moved to the next level.",
  PROMOTED_WITH_CARRYOVER:
    "Moved to the next level, with one or more failed courses to retake.",
  PROMOTED_ON_PROBATION:
    "Moved to the next level, but the CGPA is below the probation threshold. Raising it this session ends the probation.",
  REPEAT_LEVEL: "Stays at the same level for another session.",
  SPILLOVER:
    "Has finished the programme's normal duration with courses still outstanding, and continues for an extra session to complete them.",
  GRADUATING: "Has met the requirements to graduate.",
  ADVISED_TO_WITHDRAW:
    "The CGPA is below the withdrawal threshold. Please speak to your department.",
  NOT_EVALUATED:
    "Could not be evaluated automatically (for example, missing results).",
  WITHHELD: "The decision is withheld pending a review.",
}

/** Outcomes in display order (summary cards, filter menus). */
export const OUTCOME_ORDER: StandingOutcome[] = [
  "PROMOTED",
  "PROMOTED_WITH_CARRYOVER",
  "PROMOTED_ON_PROBATION",
  "REPEAT_LEVEL",
  "SPILLOVER",
  "GRADUATING",
  "ADVISED_TO_WITHDRAW",
  "NOT_EVALUATED",
  "WITHHELD",
  "PENDING",
]

// ─── Run status ───────────────────────────────────────────────────────────────

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  QUEUED: "Queued",
  PREVIEWING: "Building preview",
  PREVIEW_READY: "Preview ready",
  COMMITTING: "Committing",
  COMMITTED: "Committed",
  FAILED: "Failed",
  REVERSED: "Reversed",
  DISCARDED: "Discarded",
}

export const RUN_STATUS_BADGE_CLASSES: Record<RunStatus, string> = {
  QUEUED:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  PREVIEWING:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  PREVIEW_READY:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  COMMITTING:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  COMMITTED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  FAILED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  REVERSED:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  DISCARDED:
    "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400",
}

/** Statuses during which a background job is running (poll these). */
export const ACTIVE_RUN_STATUSES: readonly RunStatus[] = [
  "QUEUED",
  "PREVIEWING",
  "COMMITTING",
]

export function isRunActive(status: RunStatus): boolean {
  return ACTIVE_RUN_STATUSES.includes(status)
}

/** Overrides, refresh and discard are only allowed on a ready preview. */
export function isRunEditable(status: RunStatus): boolean {
  return status === "PREVIEW_READY"
}

// ─── Other enums ──────────────────────────────────────────────────────────────

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  CLEARED: "Cleared",
  OWING: "Owing",
  OWING_ALLOWED: "Owing (allowed to register)",
  WAIVED: "Waived",
}

export const FINANCIAL_STATUS_BADGE_CLASSES: Record<FinancialStatus, string> = {
  CLEARED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  OWING:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  OWING_ALLOWED:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  WAIVED:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
}

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  NOT_REGISTERED: "Not registered",
  REGISTERED: "Registered",
  DEFERRED: "Deferred",
}

export const STANDING_STATE_LABELS: Record<StandingState, string> = {
  OPEN: "Open",
  FINALIZED: "Finalized",
  VOIDED: "Voided",
}

export const EXCEPTION_LABELS: Record<RunExceptionCode, string> = {
  MISSING_RESULTS: "Missing results",
  WITHHELD_RESULT: "Withheld result",
  NOT_REGISTERED_IN_SESSION: "Not registered in session",
  LEVEL_MAPPING_NOT_FOUND: "No next level mapped",
  EXCEEDED_MAX_DURATION: "Exceeded maximum duration",
  STATUS_EXCLUDED: "Student status excluded",
  NO_OPEN_STANDING: "No open standing",
}

export const READINESS_BLOCKER_LABELS: Record<ReadinessBlockerCode, string> = {
  SESSION_NOT_LOCKED: "Session not locked",
  RESULT_SHEETS_NOT_APPROVED: "Result sheets not approved",
  GRADES_MISSING: "Grades missing",
  GRADE_ADJUSTMENTS_PENDING: "Grade adjustments pending",
  GRADE_PULL_RUNNING: "Grade pull running",
  CGPA_NOT_COMPUTED: "CGPA not computed",
  TARGET_SESSION_INCOMPLETE: "Target session incomplete",
  TARGET_OFFERINGS_MISSING: "Target course offerings missing",
  TARGET_FEE_TYPES_MISSING: "Target fee types missing",
  RUN_ALREADY_ACTIVE: "A run is already active",
}

/** Label for a code the backend sent; unknown codes fall back to the raw code. */
export function exceptionLabel(code: string): string {
  return (RUN_EXCEPTION_CODES as readonly string[]).includes(code)
    ? EXCEPTION_LABELS[code as RunExceptionCode]
    : code
}

export function readinessCodeLabel(code: string): string {
  return (READINESS_BLOCKER_CODES as readonly string[]).includes(code)
    ? READINESS_BLOCKER_LABELS[code as ReadinessBlockerCode]
    : code
}
