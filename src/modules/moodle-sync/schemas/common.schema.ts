import { z } from "zod"

// REMOVED_IN_MOODLE — sandbox/moodle-sync-reconciliation/: set by a
// reconcile apply when the Moodle record a mapping points at no longer exists.
export const SyncStatusSchema = z.enum([
  "PENDING",
  "SYNCED",
  "FAILED",
  "STALE",
  "REMOVED_IN_MOODLE",
])
export const SyncDirectionSchema = z.enum(["PUSH", "PULL", "BIDIRECTIONAL"])

export const SyncQueryFiltersSchema = z.object({
  status: SyncStatusSchema.optional(),
  direction: SyncDirectionSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})
