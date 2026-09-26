// Types for the Results-from-Moodle contract — inferred from ../schemas,
// never duplicated by hand. Legacy grade types stay in ./grades.types.ts.

import type { z } from "zod"
import type {
  AdjustmentBatchSchema,
  AdjustmentCreateSchema,
  AdjustmentHistorySchema,
  AdjustmentPreviewSchema,
  AdjustmentTargetSchema,
  ApproveSheetSchema,
  BatchApproveSchema,
  BatchRejectSchema,
  BatchStatusSchema,
  ComponentSchema,
  GradeItemMappingSchema,
  GradePullJobSchema,
  GradeScaleFormSchema,
  GradeStatusSchema,
  GradingSchemeFormSchema,
  GradingSchemeSchema,
  ItemComponentSchema,
  MapGradeItemSchema,
  PaginationMetaSchema,
  ProgramSchemeOverrideSchema,
  PublishPreviewSchema,
  PublishRequestSchema,
  PublishResultSchema,
  PullJobStatusSchema,
  PullRequestSchema,
  PullStartedSchema,
  RejectSheetSchema,
  ReopenSheetSchema,
  ResultPolicyFormSchema,
  ResultPolicySchema,
  ResultSheetRowSchema,
  ResultSheetSchema,
  ResultSheetSummarySchema,
  ResultStatusSchema,
  SemesterSessionLinkSchema,
  RevertSchema,
  RowFlagSchema,
  SchemeGradeScaleSchema,
  SchemeResolutionSchema,
  SingleAdjustSchema,
  SingleAdjustmentSchema,
  StudentGradeSchema,
} from "../schemas"

export type SheetStatus = z.infer<typeof GradeStatusSchema>
export type ScoreComponent = z.infer<typeof ComponentSchema>
export type ItemComponent = z.infer<typeof ItemComponentSchema>
export type RowFlag = z.infer<typeof RowFlagSchema>
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export type ResultSheetSummary = z.infer<typeof ResultSheetSummarySchema>
export type ResultSheetRow = z.infer<typeof ResultSheetRowSchema>
export type ResultSheet = z.infer<typeof ResultSheetSchema>
export type GradeItemMapping = z.infer<typeof GradeItemMappingSchema>

export type PullJobStatus = z.infer<typeof PullJobStatusSchema>
export type GradePullJob = z.infer<typeof GradePullJobSchema>
export type PullStarted = z.infer<typeof PullStartedSchema>

export type AdjustmentTarget = z.infer<typeof AdjustmentTargetSchema>
export type BatchStatus = z.infer<typeof BatchStatusSchema>
export type AdjustmentPreview = z.infer<typeof AdjustmentPreviewSchema>
export type AdjustmentBatch = z.infer<typeof AdjustmentBatchSchema>
export type SingleAdjustment = z.infer<typeof SingleAdjustmentSchema>
export type AdjustmentHistory = z.infer<typeof AdjustmentHistorySchema>

export type PublishPreview = z.infer<typeof PublishPreviewSchema>
export type PublishResultSummary = z.infer<typeof PublishResultSchema>

export type ResultGradingScheme = z.infer<typeof GradingSchemeSchema>
export type SchemeGradeScale = z.infer<typeof SchemeGradeScaleSchema>
export type SchemeResolution = z.infer<typeof SchemeResolutionSchema>
export type ResultPolicy = z.infer<typeof ResultPolicySchema>

export type StudentGrade = z.infer<typeof StudentGradeSchema>
export type ResultStatus = z.infer<typeof ResultStatusSchema>
export type SemesterSessionLink = z.infer<typeof SemesterSessionLinkSchema>

// Request bodies
export type PullRequest = z.infer<typeof PullRequestSchema>
export type MapGradeItemBody = z.infer<typeof MapGradeItemSchema>
export type ApproveSheetBody = z.infer<typeof ApproveSheetSchema>
export type RejectSheetBody = z.infer<typeof RejectSheetSchema>
export type ReopenSheetBody = z.infer<typeof ReopenSheetSchema>
export type AdjustmentCreateBody = z.infer<typeof AdjustmentCreateSchema>
export type SingleAdjustBody = z.infer<typeof SingleAdjustSchema>
export type BatchApproveBody = z.infer<typeof BatchApproveSchema>
export type BatchRejectBody = z.infer<typeof BatchRejectSchema>
export type RevertBody = z.infer<typeof RevertSchema>
export type PublishRequest = z.infer<typeof PublishRequestSchema>
export type GradingSchemeForm = z.infer<typeof GradingSchemeFormSchema>
export type GradeScaleForm = z.infer<typeof GradeScaleFormSchema>
export type ProgramSchemeOverrideBody = z.infer<
  typeof ProgramSchemeOverrideSchema
>
export type ResultPolicyForm = z.infer<typeof ResultPolicyFormSchema>

// ─── Filters (UI → query params) ──────────────────────────────────────────────

export interface ResultSheetFilters {
  semesterId?: number
  programId?: number
  departmentId?: number
  status?: SheetStatus
  flag?: RowFlag
  search?: string
  mine?: boolean
  page: number
  limit: number
}

export interface AdjustmentQueueFilters {
  status: BatchStatus
  semesterId?: number
  page: number
  limit: number
}

export interface PullJobFilters {
  semesterId?: number
  /** Sent comma-joined, e.g. `status=QUEUED,RUNNING`. */
  status?: PullJobStatus[]
  page: number
  limit: number
}

// ─── Live-or-fallback envelope (CLAUDE.md §14) ────────────────────────────────

// Every contract query resolves to one of these. `available: false` means
// the endpoint doesn't exist on the backend yet (route 404/405) — components
// render an honest "not available yet" state, never invented data.
export type Live<T> =
  | { available: true; data: T }
  | { available: false; data: null }

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}
