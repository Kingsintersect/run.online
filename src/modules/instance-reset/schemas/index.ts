import { z } from "zod"

// Instance reset (/api/v1/system/instance-reset; live on QHUB, absent on
// RUN). Every response is parsed so a shape drift
// shows up as an error instead of a half-rendered screen, and every payload is
// parsed before it is sent.

/** Run ids aren't typed by the contract; accept a number or a string. */
const IdSchema = z.union([z.string().min(1), z.number()]).transform(String)

const ActorSchema = z.object({
  id: IdSchema,
  name: z.string(),
})

const CountSchema = z.number().int().nonnegative().nullable()

// ── GET /groups ─────────────────────────────────────────────────────

export const ResetTableSchema = z.object({
  name: z.string().min(1),
  rowCount: CountSchema,
  note: z.string().nullable().default(null),
})

export const MoodleEntitySchema = z.object({
  type: z.string().min(1),
  label: z.string(),
  count: CountSchema,
})

export const ResetGroupSchema = z.object({
  key: z.string().min(1),
  label: z.string(),
  description: z.string(),
  order: z.number(),
  dependsOn: z.array(z.string()).default([]),
  cascadesTo: z.array(z.string()).default([]),
  tables: z.array(ResetTableSchema),
  moodle: z.object({ entities: z.array(MoodleEntitySchema) }).nullable(),
  preserved: z.array(z.string()).default([]),
  totalRows: CountSchema,
})

/**
 * The wire shape of GET /groups. As deployed (QHUB, 2026-10-05) the `lms`
 * group's Moodle entities carry only `{ type, count }`, no `label`, so the
 * label is optional here; the service fills it from the local catalogue.
 */
export const ApiResetGroupSchema = ResetGroupSchema.extend({
  moodle: z
    .object({
      entities: z.array(
        MoodleEntitySchema.extend({
          label: z.string().nullable().optional(),
        })
      ),
    })
    .nullable(),
})

export const ApiResetGroupListSchema = z.array(ApiResetGroupSchema)

/** The local catalogue's shape: the API group without any counts. */
export const PlannedResetGroupSchema = ResetGroupSchema.omit({
  totalRows: true,
}).extend({
  tables: z.array(ResetTableSchema.omit({ rowCount: true })),
  moodle: z
    .object({ entities: z.array(MoodleEntitySchema.omit({ count: true })) })
    .nullable(),
})

export const PreservedCatalogEntrySchema = z.object({
  table: z.string(),
  reason: z.string(),
})

export const PreservedCatalogItemSchema = z.object({
  title: z.string(),
  entries: z.array(PreservedCatalogEntrySchema),
})

// ── Runs ────────────────────────────────────────────────────────────

export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "partially_failed",
])

export const RunStepStatusSchema = z.enum([
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
])

export const RunSummarySchema = z.object({
  id: IdSchema,
  status: RunStatusSchema,
  requestedGroups: z.array(z.string()).default([]),
  resolvedGroups: z.array(z.string()).default([]),
  totalRows: CountSchema,
  deletedRows: CountSchema,
  /** Never null (API_CONTRACTS): set when the run is accepted. */
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  startedBy: ActorSchema.nullable(),
  backupRef: z.string().nullable(),
  error: z.string().nullable(),
})

export const RunStepSchema = z.object({
  group: z.string(),
  /** "table:payments" or "moodle:users". */
  target: z.string(),
  status: RunStepStatusSchema,
  deleted: CountSchema,
  total: CountSchema,
  error: z.string().nullable(),
})

export const RunDetailSchema = RunSummarySchema.extend({
  steps: z.array(RunStepSchema).default([]),
})

export const RunListSchema = z.array(RunSummarySchema)

// ── GET /status ─────────────────────────────────────────────────────

export const ResetStatusSchema = z.object({
  enabled: z.boolean(),
  locked: z.boolean(),
  lockedAt: z.string().nullable(),
  lockedBy: ActorSchema.nullable(),
  institutionName: z.string(),
  moodle: z.object({
    configured: z.boolean(),
    /** Null when Moodle isn't configured, so it was never probed. */
    reachable: z.boolean().nullable(),
    siteUrl: z.string().nullable(),
  }),
  activeRun: z.object({ id: IdSchema, status: RunStatusSchema }).nullable(),
  lastRun: RunSummarySchema.nullable(),
})

// ── POST /preview ───────────────────────────────────────────────────

export const PreviewPayloadSchema = z.object({
  groups: z.union([
    z.literal("all"),
    z.array(z.string().min(1)).min(1, "Pick at least one group."),
  ]),
})

export const ResetPreviewSchema = z.object({
  previewId: z.string().min(1),
  expiresAt: z.string(),
  requestedGroups: z.array(z.string()),
  resolvedGroups: z.array(z.string()),
  /** Deletion order: children first. */
  tables: z.array(
    z.object({
      name: z.string(),
      group: z.string(),
      rowCount: CountSchema,
    })
  ),
  moodle: z
    .array(
      z.object({
        type: z.string(),
        label: z.string().nullable().default(null),
        count: CountSchema,
      })
    )
    .default([]),
  preserved: z.object({
    superAdminAccounts: CountSchema,
    notes: z.array(z.string()).default([]),
  }),
  totalRows: CountSchema,
  warnings: z.array(z.string()).default([]),
})

// ── Confirmation (POST /runs, POST /lock) ───────────────────────────

const ConfirmationFields = {
  confirmation: z.string().min(1, "Type the institution name."),
  password: z.string().min(1, "Enter your password."),
}

export const StartRunPayloadSchema = z.object({
  previewId: z.string().min(1),
  ...ConfirmationFields,
})

export const LockPayloadSchema = z.object(ConfirmationFields)

/** Form values; the exact-name rule is added per institution below. */
export const TypedConfirmationFormSchema = z.object(ConfirmationFields)

/**
 * The typed-confirmation form: the name must match `institutionName`
 * exactly (case-sensitive). The server trims the typed value before comparing
 * (Bruno "Runs - Create"), so surrounding spaces are ignored here too.
 */
export function typedConfirmationSchema(institutionName: string) {
  return TypedConfirmationFormSchema.refine(
    (v) => v.confirmation.trim() === institutionName,
    {
      path: ["confirmation"],
      message: "This doesn't match the institution name exactly.",
    }
  )
}

// ── Errors ({ message, code }) ──────────────────────────────────────

export const ResetErrorBodySchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  errors: z
    .record(z.string(), z.union([z.array(z.string()), z.string()]))
    .optional(),
})
