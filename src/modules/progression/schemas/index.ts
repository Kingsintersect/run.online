// ─── Session promotion & standings — contract schemas ───────────────────────
//
// Zod schemas for every response and request body of the shared API contract
// in sandbox/accademic-session-semester-migration/session-promotion-frontend-prompt.md
// ("## Shared API contract"). Field names are the contract's snake_case,
// unchanged. Responses are parsed at the service boundary
// (services/progression.service.ts); types are inferred in ../types — never
// hand-written.
//
// Laravel serialises `decimal` columns as strings ("3.12", "150000.00"), so
// every decimal accepts a number OR a numeric string and normalises to a
// number. Nothing here computes an outcome, CGPA or eligibility.

import { z } from "zod"

// ─── Primitives ───────────────────────────────────────────────────────────────

const decimal = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform((v) => Number(v))

const decimalOrNull = decimal.nullable()

// ─── Enums ────────────────────────────────────────────────────────────────────

export const StandingOutcomeSchema = z.enum([
  "PENDING",
  "PROMOTED",
  "PROMOTED_WITH_CARRYOVER",
  "PROMOTED_ON_PROBATION",
  "REPEAT_LEVEL",
  "SPILLOVER",
  "GRADUATING",
  "ADVISED_TO_WITHDRAW",
  "NOT_EVALUATED",
  "WITHHELD",
])

/** Outcomes an admin may set as a run item's final outcome (not PENDING). */
export const OverridableOutcomeSchema = StandingOutcomeSchema.exclude([
  "PENDING",
])

export const RegistrationStatusSchema = z.enum([
  "NOT_REGISTERED",
  "REGISTERED",
  "DEFERRED",
])

export const FinancialStatusSchema = z.enum([
  "CLEARED",
  "OWING",
  "OWING_ALLOWED",
  "WAIVED",
])

export const StandingStateSchema = z.enum(["OPEN", "FINALIZED", "VOIDED"])

export const RunStatusSchema = z.enum([
  "QUEUED",
  "PREVIEWING",
  "PREVIEW_READY",
  "COMMITTING",
  "COMMITTED",
  "FAILED",
  "REVERSED",
  "DISCARDED",
])

export const ProbationModeSchema = z.enum([
  "PROMOTE_ON_PROBATION",
  "REPEAT_LEVEL",
])

export const RetakePolicySchema = z.enum([
  "COUNT_ALL_ATTEMPTS",
  "REPLACE_WITH_LATEST",
  "KEEP_BEST",
])

export const ElectiveFailureModeSchema = z.enum([
  "RETAKE_SAME",
  "ANY_ELECTIVE_SAME_UNITS",
])

export const CarryoverReasonSchema = z.enum(["FAILED", "NOT_TAKEN"])

// Known codes, for label maps. Response schemas accept any string for codes
// so a new backend code never breaks parsing — it just renders its raw code.
export const READINESS_BLOCKER_CODES = [
  "SESSION_NOT_LOCKED",
  "RESULT_SHEETS_NOT_APPROVED",
  "GRADES_MISSING",
  "GRADE_ADJUSTMENTS_PENDING",
  "GRADE_PULL_RUNNING",
  "CGPA_NOT_COMPUTED",
  "TARGET_SESSION_INCOMPLETE",
  "TARGET_OFFERINGS_MISSING",
  "TARGET_FEE_TYPES_MISSING",
  "RUN_ALREADY_ACTIVE",
] as const

export const RUN_EXCEPTION_CODES = [
  "MISSING_RESULTS",
  "WITHHELD_RESULT",
  "NOT_REGISTERED_IN_SESSION",
  "LEVEL_MAPPING_NOT_FOUND",
  "EXCEEDED_MAX_DURATION",
  "STATUS_EXCLUDED",
  "NO_OPEN_STANDING",
] as const

export const PROGRESSION_ERROR_CODES = [
  "READINESS_FAILED",
  "RUN_NOT_EDITABLE",
  "RUN_NOT_REVERSIBLE",
  "OVERRIDE_REASON_REQUIRED",
  "CONFIRMATION_MISMATCH",
] as const

// ─── Shared references ────────────────────────────────────────────────────────

export const IdNameSchema = z.object({ id: z.number(), name: z.string() })

export const ProgramRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string().nullable().optional(),
})

export const LevelRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  numeric_value: z.number().nullable().optional(),
})

// Existing API list format: `{data, meta: {total, page, limit, totalPages?}}`
// (snake-cased by the service before parsing). A Laravel paginator meta
// (`current_page` / `per_page` / `last_page`) is accepted too and normalised
// to the same output shape, so either backend choice just works.
export const PaginationMetaSchema = z
  .union([
    z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      total_pages: z.number().optional(),
    }),
    z.object({
      total: z.number(),
      current_page: z.number(),
      per_page: z.number(),
      last_page: z.number().optional(),
    }),
  ])
  .transform((m) => {
    const page = "page" in m ? m.page : m.current_page
    const limit = "limit" in m ? m.limit : m.per_page
    const explicit = "page" in m ? m.total_pages : m.last_page
    return {
      total: m.total,
      page,
      limit,
      totalPages:
        explicit ?? Math.max(1, Math.ceil(m.total / Math.max(1, limit))),
    }
  })

// ─── SessionStanding ──────────────────────────────────────────────────────────

export const DebtOverrideSchema = z.object({
  by: IdNameSchema.nullable(),
  at: z.string().nullable(),
  reason: z.string(),
})

export const SessionStandingSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  academic_session: IdNameSchema,
  program: ProgramRefSchema,
  level: LevelRefSchema,
  next_level: LevelRefSchema.nullable(),
  registration_status: RegistrationStatusSchema,
  system_outcome: StandingOutcomeSchema,
  outcome: StandingOutcomeSchema,
  is_overridden: z.boolean(),
  override_reason: z.string().nullable(),
  decided_by: IdNameSchema.nullable(),
  decided_at: z.string().nullable(),
  gpa: decimalOrNull,
  cgpa: decimalOrNull,
  credit_units_earned: z.number().nullable(),
  outstanding_carryover_units: z.number(),
  financial_status: FinancialStatusSchema,
  outstanding_amount: decimal,
  debt_override: DebtOverrideSchema.nullable(),
  promotion_run_id: z.number().nullable(),
  state: StandingStateSchema,
})

// ─── Outstanding courses (derived carryovers) ─────────────────────────────────
// The contract names the endpoint but not its item shape; this mirrors the
// RegistrationContext `carryover_courses[]` entry, with the registration-only
// fields (`offering_id`, `locked`, `offering_missing`) optional/nullable.

export const OutstandingCourseSchema = z.object({
  course: z.object({
    id: z.number(),
    code: z.string(),
    title: z.string(),
    credit_units: z.number(),
  }),
  offering_id: z.number().nullable().optional(),
  reason: CarryoverReasonSchema,
  last_attempt_session: z.string().nullable(),
  locked: z.boolean().optional(),
  offering_missing: z.boolean().optional(),
})

// ─── PromotionPolicy ──────────────────────────────────────────────────────────

export const PromotionPolicySchema = z.object({
  major_program_id: z.number(),
  probation_cgpa_below: decimal,
  withdraw_cgpa_below: decimal,
  probation_mode: ProbationModeSchema,
  max_outstanding_units_before_repeat: z.number().nullable(),
  max_extra_sessions: z.number(),
  retake_policy: RetakePolicySchema,
  elective_failure_mode: ElectiveFailureModeSchema,
  max_credit_units_per_semester: z.number(),
  min_credit_units_per_semester: z.number(),
  block_registration_on_prior_debt: z.boolean(),
  require_published_results_before_next_semester: z.boolean(),
  carryover_fee_type_id: z.number().nullable(),
})

const cgpaThreshold = z
  .number({ error: "Enter a CGPA value" })
  .min(0, "Must be 0 or more")
  .max(5, "Must be 5.00 or less")

const wholeUnits = z
  .number({ error: "Enter a whole number" })
  .int("Enter a whole number")
  .min(0, "Must be 0 or more")

/**
 * PUT /promotion-policies/{major_program_id} body. `major_program_id` travels
 * in the path, so it isn't part of the body.
 */
export const PromotionPolicyPayloadSchema = z
  .object({
    probation_cgpa_below: cgpaThreshold,
    withdraw_cgpa_below: cgpaThreshold,
    probation_mode: ProbationModeSchema,
    max_outstanding_units_before_repeat: wholeUnits.nullable(),
    max_extra_sessions: wholeUnits,
    retake_policy: RetakePolicySchema,
    elective_failure_mode: ElectiveFailureModeSchema,
    max_credit_units_per_semester: wholeUnits.min(1, "Must be at least 1"),
    min_credit_units_per_semester: wholeUnits,
    block_registration_on_prior_debt: z.boolean(),
    require_published_results_before_next_semester: z.boolean(),
    carryover_fee_type_id: z.number().int().positive().nullable(),
  })
  .refine(
    (p) => p.min_credit_units_per_semester <= p.max_credit_units_per_semester,
    {
      path: ["min_credit_units_per_semester"],
      message: "Minimum units can't be more than the maximum",
    }
  )

// ─── Readiness (semester rollover + session close) ────────────────────────────

const ContextValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.number(), z.string()])),
])

export const ReadinessIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  count: z.number().nullable().optional(),
  context: z.record(z.string(), ContextValueSchema).nullable().optional(),
})

export const ReadinessSchema = z.object({
  ready: z.boolean(),
  blockers: z.array(ReadinessIssueSchema).default([]),
  warnings: z.array(ReadinessIssueSchema).default([]),
})

// ─── PromotionRun ─────────────────────────────────────────────────────────────

export const RunProgressSchema = z.object({
  processed: z.number(),
  total: z.number(),
})

export const PromotionRunSchema = z.object({
  id: z.number(),
  major_program: IdNameSchema,
  source_session: IdNameSchema,
  target_session: IdNameSchema,
  status: RunStatusSchema,
  progress: RunProgressSchema.nullable(),
  // Keyed by standing_outcome; keys with zero may be omitted.
  counts: z.record(z.string(), z.number()).default({}),
  exception_count: z.number(),
  override_count: z.number(),
  created_by: IdNameSchema.nullable(),
  created_at: z.string().nullable(),
  committed_by: IdNameSchema.nullable(),
  committed_at: z.string().nullable(),
  reversed_by: IdNameSchema.nullable(),
  reversed_at: z.string().nullable(),
  reverse_reason: z.string().nullable(),
  is_reversible: z.boolean(),
  error: z.string().nullable(),
})

export const PromotionRunFiltersSchema = z.object({
  major_program_id: z.number().int().positive().optional(),
  status: RunStatusSchema.optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional(),
})

export const CreatePromotionRunPayloadSchema = z.object({
  major_program_id: z.number().int().positive(),
  source_session_id: z.number().int().positive(),
  target_session_id: z.number().int().positive(),
})

// ─── PromotionRunItem ─────────────────────────────────────────────────────────

export const PromotionRunItemSchema = z.object({
  id: z.number(),
  student: z.object({
    id: z.number(),
    matric_number: z.string().nullable(),
    name: z.string(),
  }),
  student_status: z.string(),
  program: ProgramRefSchema,
  current_level: LevelRefSchema,
  proposed_next_level: LevelRefSchema.nullable(),
  system_outcome: StandingOutcomeSchema,
  final_outcome: StandingOutcomeSchema,
  is_overridden: z.boolean(),
  override_reason: z.string().nullable(),
  overridden_by: IdNameSchema.nullable(),
  gpa: decimalOrNull,
  cgpa: decimalOrNull,
  outstanding_carryover_units: z.number(),
  financial_status: FinancialStatusSchema,
  outstanding_amount: decimal,
  exception_codes: z.array(z.string()).default([]),
})

export const RunItemFiltersSchema = z.object({
  outcome: StandingOutcomeSchema.optional(),
  program_id: z.number().int().positive().optional(),
  level_id: z.number().int().positive().optional(),
  has_exception: z.boolean().optional(),
  is_overridden: z.boolean().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(200).optional(),
})

// ─── Write payloads ───────────────────────────────────────────────────────────

const reason = z
  .string({ error: "A reason is required" })
  .trim()
  .min(1, "A reason is required")
  .max(1000, "Keep the reason under 1000 characters")

export const OverrideRunItemPayloadSchema = z.object({
  final_outcome: OverridableOutcomeSchema,
  override_reason: reason,
})

export const BulkOverridePayloadSchema = z.object({
  item_ids: z
    .array(z.number().int().positive())
    .min(1, "Select at least one student"),
  final_outcome: OverridableOutcomeSchema,
  override_reason: reason,
})

export const CommitRunPayloadSchema = z.object({
  confirm_target_session_name: z
    .string()
    .trim()
    .min(1, "Type the target session's name to confirm"),
})

/**
 * Commit form schema that also checks the typed name matches the target
 * session (the server re-checks and answers CONFIRMATION_MISMATCH).
 */
export function commitRunFormSchema(targetSessionName: string) {
  return CommitRunPayloadSchema.refine(
    (v) => v.confirm_target_session_name === targetSessionName.trim(),
    {
      path: ["confirm_target_session_name"],
      message: `Type "${targetSessionName}" exactly to confirm`,
    }
  )
}

export const ReversePayloadSchema = z.object({ reason })

export const DebtOverridePayloadSchema = z.object({ reason })

// ─── Error bodies ─────────────────────────────────────────────────────────────

// 409/422 `{message, code}` (+ Laravel `errors`); READINESS_FAILED also carries
// the readiness payload, either under `readiness`/`data` or at the top level.
export const ProgressionErrorBodySchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})
