import type { z } from "zod"
import * as ClearanceSchemas from "../schemas/clearance.schema"

export type ClearanceStatus = z.infer<
  typeof ClearanceSchemas.ClearanceStatusSchema
>
export type ClearanceSummaryStatus = z.infer<
  typeof ClearanceSchemas.ClearanceSummaryStatusSchema
>
export type ClearanceType = z.infer<typeof ClearanceSchemas.ClearanceTypeSchema>
export type StudentClearance = z.infer<
  typeof ClearanceSchemas.StudentClearanceSchema
>
export type ClearanceSummaryItem = z.infer<
  typeof ClearanceSchemas.ClearanceSummaryItemSchema
>
export type ClearanceSummary = z.infer<
  typeof ClearanceSchemas.ClearanceSummarySchema
>
export type ClearanceQueryFilters = z.infer<
  typeof ClearanceSchemas.ClearanceQueryFiltersSchema
>
export type CreateClearanceTypeDto = z.infer<
  typeof ClearanceSchemas.CreateClearanceTypeDtoSchema
>
export type UpdateClearanceTypeDto = z.infer<
  typeof ClearanceSchemas.UpdateClearanceTypeDtoSchema
>
export type RequestClearanceDto = z.infer<
  typeof ClearanceSchemas.RequestClearanceDtoSchema
>
export type ApproveClearanceDto = z.infer<
  typeof ClearanceSchemas.ApproveClearanceDtoSchema
>
export type RejectClearanceDto = z.infer<
  typeof ClearanceSchemas.RejectClearanceDtoSchema
>
