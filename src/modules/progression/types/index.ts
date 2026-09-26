import type { z } from "zod"
import type {
  BulkOverridePayloadSchema,
  CarryoverReasonSchema,
  CommitRunPayloadSchema,
  CreatePromotionRunPayloadSchema,
  DebtOverridePayloadSchema,
  DebtOverrideSchema,
  ElectiveFailureModeSchema,
  FinancialStatusSchema,
  IdNameSchema,
  LevelRefSchema,
  OutstandingCourseSchema,
  OverridableOutcomeSchema,
  OverrideRunItemPayloadSchema,
  PaginationMetaSchema,
  ProbationModeSchema,
  ProgramRefSchema,
  PromotionPolicyPayloadSchema,
  PromotionPolicySchema,
  PromotionRunFiltersSchema,
  PromotionRunItemSchema,
  PromotionRunSchema,
  ReadinessIssueSchema,
  ReadinessSchema,
  RegistrationStatusSchema,
  RetakePolicySchema,
  ReversePayloadSchema,
  RunItemFiltersSchema,
  RunProgressSchema,
  RunStatusSchema,
  SessionStandingSchema,
  StandingOutcomeSchema,
  StandingStateSchema,
  READINESS_BLOCKER_CODES,
  RUN_EXCEPTION_CODES,
  PROGRESSION_ERROR_CODES,
} from "../schemas"

// ─── Enums ────────────────────────────────────────────────────────────────────
export type StandingOutcome = z.infer<typeof StandingOutcomeSchema>
export type OverridableOutcome = z.infer<typeof OverridableOutcomeSchema>
export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>
export type FinancialStatus = z.infer<typeof FinancialStatusSchema>
export type StandingState = z.infer<typeof StandingStateSchema>
export type RunStatus = z.infer<typeof RunStatusSchema>
export type ProbationMode = z.infer<typeof ProbationModeSchema>
export type RetakePolicy = z.infer<typeof RetakePolicySchema>
export type ElectiveFailureMode = z.infer<typeof ElectiveFailureModeSchema>
export type CarryoverReason = z.infer<typeof CarryoverReasonSchema>
export type ReadinessBlockerCode = (typeof READINESS_BLOCKER_CODES)[number]
export type RunExceptionCode = (typeof RUN_EXCEPTION_CODES)[number]
export type ProgressionErrorCode = (typeof PROGRESSION_ERROR_CODES)[number]

// ─── Resources ────────────────────────────────────────────────────────────────
export type IdName = z.infer<typeof IdNameSchema>
export type ProgramRef = z.infer<typeof ProgramRefSchema>
export type LevelRef = z.infer<typeof LevelRefSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>
export type DebtOverride = z.infer<typeof DebtOverrideSchema>
export type SessionStanding = z.infer<typeof SessionStandingSchema>
export type OutstandingCourse = z.infer<typeof OutstandingCourseSchema>
export type PromotionPolicy = z.infer<typeof PromotionPolicySchema>
export type ReadinessIssue = z.infer<typeof ReadinessIssueSchema>
export type Readiness = z.infer<typeof ReadinessSchema>
export type RunProgress = z.infer<typeof RunProgressSchema>
export type PromotionRun = z.infer<typeof PromotionRunSchema>
export type PromotionRunItem = z.infer<typeof PromotionRunItemSchema>

// ─── Filters ──────────────────────────────────────────────────────────────────
export type PromotionRunFilters = z.infer<typeof PromotionRunFiltersSchema>
export type RunItemFilters = z.infer<typeof RunItemFiltersSchema>

// ─── Payloads (form values = z.input, dispatched body = z.output) ─────────────
export type PromotionPolicyPayload = z.infer<
  typeof PromotionPolicyPayloadSchema
>
export type CreatePromotionRunPayload = z.infer<
  typeof CreatePromotionRunPayloadSchema
>
export type OverrideRunItemPayload = z.infer<
  typeof OverrideRunItemPayloadSchema
>
export type BulkOverridePayload = z.infer<typeof BulkOverridePayloadSchema>
export type CommitRunPayload = z.infer<typeof CommitRunPayloadSchema>
export type ReversePayload = z.infer<typeof ReversePayloadSchema>
export type DebtOverridePayload = z.infer<typeof DebtOverridePayloadSchema>

// ─── Live-or-fallback envelope (CLAUDE.md §14) ────────────────────────────────
// Same shape as student-grades' `Live<T>`: `available: false` means the route
// doesn't exist on the backend yet — render an honest "awaiting the backend"
// state, never invented data.
export type { Live } from "@/modules/student-grades/types"

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
