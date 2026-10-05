import type { z } from "zod"
import type {
  LockPayloadSchema,
  MoodleEntitySchema,
  PlannedResetGroupSchema,
  PreservedCatalogEntrySchema,
  PreservedCatalogItemSchema,
  PreviewPayloadSchema,
  ResetGroupSchema,
  ResetPreviewSchema,
  ResetStatusSchema,
  ResetTableSchema,
  RunDetailSchema,
  RunStatusSchema,
  RunStepSchema,
  RunStepStatusSchema,
  RunSummarySchema,
  StartRunPayloadSchema,
  TypedConfirmationFormSchema,
} from "../schemas"

export type ResetTable = z.infer<typeof ResetTableSchema>
export type MoodleEntity = z.infer<typeof MoodleEntitySchema>
export type ResetGroup = z.infer<typeof ResetGroupSchema>
export type PlannedResetGroup = z.infer<typeof PlannedResetGroupSchema>
export type PreservedCatalogEntry = z.infer<typeof PreservedCatalogEntrySchema>
export type PreservedCatalogItem = z.infer<typeof PreservedCatalogItemSchema>
export type ResetStatus = z.infer<typeof ResetStatusSchema>
export type RunStatus = z.infer<typeof RunStatusSchema>
export type RunStepStatus = z.infer<typeof RunStepStatusSchema>
export type RunSummary = z.infer<typeof RunSummarySchema>
export type RunStep = z.infer<typeof RunStepSchema>
export type RunDetail = z.infer<typeof RunDetailSchema>
export type PreviewPayload = z.infer<typeof PreviewPayloadSchema>
export type ResetPreview = z.infer<typeof ResetPreviewSchema>
export type StartRunPayload = z.infer<typeof StartRunPayloadSchema>
export type LockPayload = z.infer<typeof LockPayloadSchema>
export type TypedConfirmationValues = z.infer<
  typeof TypedConfirmationFormSchema
>

/**
 * "live": the /system/instance-reset route answered. "planned": it isn't
 * built yet, so the screen shows the local catalogue (no counts, no actions).
 */
export type DataSource = "live" | "planned"

export interface Sourced<T> {
  source: DataSource
  data: T
}

/** What a reset flow is about to clear. */
export type ResetTarget = { kind: "all" } | { kind: "group"; key: string }

/** Every error code in the contract, plus the client-side "not built yet". */
export type ResetErrorCode =
  | "FORBIDDEN"
  | "RESET_DISABLED"
  | "INSTANCE_LOCKED"
  | "RUN_IN_PROGRESS"
  | "PREVIEW_EXPIRED"
  | "PREVIEW_STALE"
  | "CONFIRMATION_MISMATCH"
  | "INVALID_PASSWORD"
  | "RUN_NOT_FOUND"
  | "VALIDATION"
  | "ENDPOINT_MISSING"
