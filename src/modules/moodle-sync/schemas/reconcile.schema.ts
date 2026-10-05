import { z } from "zod"

// Moodle Sync Reconcile & Reset — sandbox/moodle-sync-reconciliation/API_CONTRACTS.md.

// Reconcile is only for the modules other portal data links to — they must
// never be wiped. Reset is only for pull-only caches. The two sets never
// overlap; see sandbox/moodle-sync-reconciliation/README.md §3.
export const ReconcileModuleSchema = z.enum(["categories", "courses", "users"])
export const ResetModuleSchema = z.enum(["assessments", "calendar", "grades"])

export const ReconcileChangeKindSchema = z.enum([
  "CREATE",
  "RENAMED",
  "MOVED",
  "REMOVED_IN_MOODLE",
  "NEEDS_MAPPING",
  // B3g: a mapping flagged REMOVED_IN_MOODLE whose Moodle record is back
  // (otherwise unchanged). Applying returns it to SYNCED.
  "REAPPEARED_UNMAPPED",
  // B23 item 2 (bruno "Reconcile - Preview Categories", 2026-10-02): the
  // live category's idnumber names a portal node whose mapping row points
  // at a DIFFERENT Moodle category. Apply refuses it (a silent no-op); the
  // fix is a deliberate Re-link via "Category Sync - Resolve".
  "MISMATCHED",
])

/** Kinds that apply never writes, so they don't count as pending changes. */
export const NON_APPLIABLE_RECONCILE_KINDS = ["MISMATCHED"] as const

// `parentName` is set for categories, `categoryName` for courses, `role` for
// users — the one "where does this sit" field that module has. A MISMATCHED
// change carries the mapping's stored Moodle category in `before`
// (moodleCategoryId / moodleCategoryName) and the portal node the idnumber
// names in `after` (academicUnitId / academicUnitName / idnumber), with no
// `name` on either.
const ReconcileSnapshotSchema = z.object({
  name: z.string().optional(),
  parentName: z.string().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  moodleCategoryId: z.number().nullable().optional(),
  moodleCategoryName: z.string().nullable().optional(),
  academicUnitId: z.number().nullable().optional(),
  academicUnitName: z.string().nullable().optional(),
  idnumber: z.string().nullable().optional(),
})

export const ReconcileChangeSchema = z.object({
  kind: ReconcileChangeKindSchema,
  syncId: z.number().nullable(),
  moodleId: z.number(),
  name: z.string(),
  before: ReconcileSnapshotSchema.nullable(),
  after: ReconcileSnapshotSchema.nullable(),
})

export const ReconcileSummarySchema = z.object({
  toCreate: z.number(),
  renamed: z.number(),
  moved: z.number(),
  removedInMoodle: z.number(),
  needsMapping: z.number(),
  unchanged: z.number(),
})

export const ReconcilePreviewSchema = z.object({
  previewId: z.string(),
  module: ReconcileModuleSchema,
  expiresAt: z.string(),
  summary: ReconcileSummarySchema,
  changes: z.array(ReconcileChangeSchema),
})

export const ApplyReconcileRequestSchema = z.object({
  previewId: z.string().min(1, "Run a preview before applying"),
})

export const ReconcileApplyResultSchema = z.object({
  module: ReconcileModuleSchema,
  applied: z.object({
    created: z.number(),
    renamed: z.number(),
    moved: z.number(),
    markedRemoved: z.number(),
    needsMapping: z.number(),
  }),
})

export const ResetRequestSchema = z.object({
  repull: z.boolean(),
})

export const ResetResultSchema = z.object({
  module: ResetModuleSchema,
  deleted: z.number().nullable(),
  repullQueued: z.boolean(),
})
