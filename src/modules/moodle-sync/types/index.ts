import type { z } from "zod"
import * as CommonSchemas from "../schemas/common.schema"
import * as CategorySchemas from "../schemas/category.schema"
import * as CohortSchemas from "../schemas/cohort.schema"
import * as UserSchemas from "../schemas/user.schema"
import * as CourseSchemas from "../schemas/course.schema"
import * as EnrollmentSchemas from "../schemas/enrollment.schema"
import * as AssessmentSchemas from "../schemas/assessment.schema"
import * as GradeSchemas from "../schemas/grade.schema"
import * as CalendarSchemas from "../schemas/calendar.schema"
import * as ReconcileSchemas from "../schemas/reconcile.schema"
import * as EnrollmentDriftSchemas from "../schemas/enrollment-drift.schema"

export type SyncStatus = z.infer<typeof CommonSchemas.SyncStatusSchema>
export type SyncDirection = z.infer<typeof CommonSchemas.SyncDirectionSchema>
export type SyncQueryFilters = z.infer<
  typeof CommonSchemas.SyncQueryFiltersSchema
>

export type PushCategoryDto = z.infer<
  typeof CategorySchemas.PushCategoryDtoSchema
>
export type CategorySyncResponse = z.infer<
  typeof CategorySchemas.CategorySyncResponseSchema
>
export type ResolveCategoryMappingDto = z.infer<
  typeof CategorySchemas.ResolveCategoryMappingSchema
>

export type CohortSyncResponse = z.infer<
  typeof CohortSchemas.CohortSyncResponseSchema
>
export type PushCohortDto = z.infer<typeof CohortSchemas.PushCohortDtoSchema>
export type SyncCohortMembersResult = z.infer<
  typeof CohortSchemas.SyncCohortMembersResultSchema
>

export type MoodleRole = z.infer<typeof UserSchemas.MoodleRoleSchema>
export type PortalRole = z.infer<typeof UserSchemas.PortalRoleSchema>
export type UserSyncResponse = z.infer<
  typeof UserSchemas.UserSyncResponseSchema
>
export type UserSyncQueryFilters = z.infer<
  typeof UserSchemas.UserSyncQueryFiltersSchema
>
export type UnmatchedMoodleUser = z.infer<
  typeof UserSchemas.UnmatchedMoodleUserSchema
>
export type SkippedMoodleUser = z.infer<
  typeof UserSchemas.SkippedMoodleUserSchema
>
export type PullUsersResult = z.infer<typeof UserSchemas.PullUsersResultSchema>

export type CourseSyncResponse = z.infer<
  typeof CourseSchemas.CourseSyncResponseSchema
>

export type EnrollmentSyncResponse = z.infer<
  typeof EnrollmentSchemas.EnrollmentSyncResponseSchema
>

export type AssessmentType = z.infer<
  typeof AssessmentSchemas.AssessmentTypeSchema
>
export type AssessmentResponse = z.infer<
  typeof AssessmentSchemas.AssessmentResponseSchema
>
export type AssessmentFilter = z.infer<
  typeof AssessmentSchemas.AssessmentFilterSchema
>
export type PaginatedAssessments = z.infer<
  typeof AssessmentSchemas.PaginatedAssessmentsSchema
>
export type UpdateVisibilityPayload = z.infer<
  typeof AssessmentSchemas.UpdateVisibilitySchema
>
export type VisibilityResponse = z.infer<
  typeof AssessmentSchemas.VisibilityResponseSchema
>
export type AssessmentSyncResult = z.infer<
  typeof AssessmentSchemas.SyncResultSchema
>
export type AssessmentSyncStatusResult = z.infer<
  typeof AssessmentSchemas.SyncStatusSchema
>
export type CaPreviewItem = z.infer<
  typeof AssessmentSchemas.CaPreviewItemSchema
>
export type CaPreviewResponse = z.infer<
  typeof AssessmentSchemas.CaPreviewResponseSchema
>

export type GradeResponse = z.infer<typeof GradeSchemas.GradeResponseSchema>

export type CalendarEventType = z.infer<
  typeof CalendarSchemas.CalendarEventTypeSchema
>
export type CalendarEventResponse = z.infer<
  typeof CalendarSchemas.CalendarEventResponseSchema
>

export interface UsersBulkPushPayload {
  userIds: number[]
}

export interface CoursesBulkPushPayload {
  courseOfferingIds: number[]
}

// Reconcile & Reset — sandbox/moodle-sync-reconciliation/
export type ReconcileModule = z.infer<
  typeof ReconcileSchemas.ReconcileModuleSchema
>
export type ResetModule = z.infer<typeof ReconcileSchemas.ResetModuleSchema>
export type ReconcileChangeKind = z.infer<
  typeof ReconcileSchemas.ReconcileChangeKindSchema
>
export type ReconcileChange = z.infer<
  typeof ReconcileSchemas.ReconcileChangeSchema
>
export type ReconcileSummary = z.infer<
  typeof ReconcileSchemas.ReconcileSummarySchema
>
export type ReconcilePreview = z.infer<
  typeof ReconcileSchemas.ReconcilePreviewSchema
>
export type ReconcileApplyResult = z.infer<
  typeof ReconcileSchemas.ReconcileApplyResultSchema
>
export type ResetResult = z.infer<typeof ReconcileSchemas.ResetResultSchema>

// Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md
export type EnrollmentDriftKind = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftKindSchema
>
export type EnrollmentDriftStatus = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftStatusSchema
>
export type EnrollmentDriftResolution = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftResolutionSchema
>
export type DriftScanState = z.infer<
  typeof EnrollmentDriftSchemas.DriftScanStateSchema
>
export type EnrollmentDriftItem = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftItemSchema
>
export type EnrollmentDriftList = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftListSchema
>
export type EnrollmentDriftSummary = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftSummarySchema
>
export type DriftScanStatus = z.infer<
  typeof EnrollmentDriftSchemas.DriftScanStatusSchema
>
export type CourseDriftCheck = z.infer<
  typeof EnrollmentDriftSchemas.CourseDriftCheckSchema
>
export type EnrollmentDriftFilters = z.infer<
  typeof EnrollmentDriftSchemas.EnrollmentDriftFiltersSchema
>
export type ResolveDriftReason = z.infer<
  typeof EnrollmentDriftSchemas.ResolveDriftReasonSchema
>
