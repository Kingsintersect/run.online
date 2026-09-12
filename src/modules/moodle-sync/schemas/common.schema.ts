import { z } from "zod"

export const SyncStatusSchema = z.enum(["PENDING", "SYNCED", "FAILED", "STALE"])
export const SyncDirectionSchema = z.enum(["PUSH", "PULL", "BIDIRECTIONAL"])

export const SyncQueryFiltersSchema = z.object({
  status: SyncStatusSchema.optional(),
  direction: SyncDirectionSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})
