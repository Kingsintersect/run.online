// ─── Results from Moodle — contract schemas (v1, FINAL) ─────────────────────
//
// Zod schemas for every C8 response shape and every C7 request body of the
// shared contract (sandbox/results-moodle/API_CONTRACTS.md). Responses are
// parsed at the service boundary (services/results.service.ts); types are
// inferred in ../types/index.ts — never hand-written.
//
// Laravel serialises `decimal(5,2)` columns as strings ("12.50") unless the
// model casts them, so every score/decimal field accepts a number OR a numeric
// string and normalises to a number. Nothing here computes a grade.

import { z } from "zod"

// ─── Primitives ───────────────────────────────────────────────────────────────

const decimal = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .transform((v) => Number(v))

const decimalOrNull = decimal.nullable()

export const GradeStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PUBLISHED",
])

export const ComponentSchema = z.enum(["CA", "EXAM"])

export const ItemComponentSchema = z.enum([
  "CA",
  "EXAM",
  "EXCLUDED",
  "UNMAPPED",
])

export const RowFlagSchema = z.enum([
  "MISSING_CA",
  "MISSING_EXAM",
  "MOODLE_DRIFT",
  "SCHEME_UNRESOLVED",
  "ADJUSTMENT_SUPERSEDED",
])

export const PaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number().optional(),
})

// ─── Offerings / result sheets ────────────────────────────────────────────────

export const ResultSheetSummarySchema = z.object({
  offeringId: z.number(),
  courseId: z.number(),
  courseCode: z.string(),
  courseTitle: z.string(),
  creditUnits: z.number(),
  semesterId: z.number(),
  semesterName: z.string(),
  academicSession: z.string(),
  majorProgramId: z.number(),
  departmentName: z.string().nullable(),
  status: GradeStatusSchema,
  studentCount: z.number(),
  missingCount: z.number(),
  driftCount: z.number(),
  unmappedItemCount: z.number(),
  pendingAdjustmentBatches: z.number(),
  withheldCount: z.number(),
  lastPulledAt: z.string().nullable(),
  lecturers: z.array(z.object({ id: z.number(), name: z.string() })),
})

export const SheetRowItemSchema = z.object({
  moodleGradeItemId: z.number(),
  name: z.string(),
  component: ItemComponentSchema,
  earned: decimalOrNull,
  max: decimal,
})

// bruno "Results Sheet - Get": a TUTOR gets ca/exam/total/grade/gradePoint as
// null and adjustmentTotal 0 (raw fields + flags only). They stay optional
// as a safety net; the UI decides which columns to show from permissions.
// `moodleDrift` (backend deviation, documented) = the raw values a re-pull
// would apply to a row that has left DRAFT; present only with MOODLE_DRIFT.
export const ResultSheetRowSchema = z.object({
  gradeId: z.number(),
  studentId: z.number(),
  matricNumber: z.string(),
  studentName: z.string(),
  programCode: z.string(),
  rawCa: decimalOrNull,
  rawExam: decimalOrNull,
  ca: decimalOrNull.optional(),
  exam: decimalOrNull.optional(),
  total: decimalOrNull.optional(),
  adjustmentTotal: decimal.optional(),
  caMax: decimal.optional(),
  examMax: decimal.optional(),
  grade: z.string().nullable().optional(),
  gradePoint: decimalOrNull.optional(),
  gradingSchemeId: z.number().nullable().optional(),
  moodleDrift: z
    .object({ rawCa: decimalOrNull, rawExam: decimalOrNull })
    .nullable()
    .optional(),
  status: GradeStatusSchema,
  flags: z.array(RowFlagSchema),
  missingItems: z.array(z.string()),
  hasOutstandingFees: z.boolean().optional(),
  items: z.array(SheetRowItemSchema).optional(),
})

export const ResultSheetSchema = z.object({
  summary: ResultSheetSummarySchema,
  rows: z.array(ResultSheetRowSchema),
})

export const GradeItemMappingSchema = z.object({
  moodleGradeItemId: z.number(),
  itemName: z.string(),
  itemIdnumber: z.string().nullable(),
  categoryIdnumber: z.string().nullable(),
  gradeMax: decimal,
  component: ItemComponentSchema,
  source: z.enum(["IDNUMBER", "CATEGORY", "MANUAL"]).nullable(),
  mappedBy: z.string().nullable(),
})

// ─── Moodle pull ──────────────────────────────────────────────────────────────

export const PullJobStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "PARTIAL",
])

export const GradePullJobSchema = z.object({
  id: z.number(),
  semesterId: z.number(),
  majorProgramId: z.number().nullable(),
  status: PullJobStatusSchema,
  offeringsTotal: z.number(),
  offeringsDone: z.number(),
  rowsCreated: z.number(),
  rowsUpdated: z.number(),
  errors: z.array(z.object({ offeringId: z.number(), message: z.string() })),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
})

export const PullStartedSchema = z.object({
  jobId: z.number(),
  offeringsQueued: z.number(),
})

// ─── Adjustments ──────────────────────────────────────────────────────────────

export const AdjustmentTypeSchema = z.enum(["ADD_MARKS", "SET_MISSING"])
export const AdjustmentTargetSchema = z.enum([
  "ALL",
  "BELOW_TOTAL",
  "SELECTED",
  "MISSING_ONLY",
])
export const BatchStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPLIED",
  "REJECTED",
  "REVERTED",
])

const DistributionSchema = z.array(
  z.object({ grade: z.string(), count: z.number() })
)

const PreviewStatsSchema = z.object({
  average: decimal,
  passRate: decimal,
  distribution: DistributionSchema,
})

export const AdjustmentPreviewSchema = z.object({
  affected: z.number(),
  capped: z.number(),
  skipped: z.number(),
  requiresApproval: z.boolean(),
  before: PreviewStatsSchema,
  after: PreviewStatsSchema,
  rows: z.array(
    z.object({
      gradeId: z.number(),
      matricNumber: z.string(),
      before: decimalOrNull,
      after: decimalOrNull,
      capped: z.boolean(),
    })
  ),
})

export const AdjustmentBatchSchema = z.object({
  id: z.number(),
  offeringId: z.number(),
  type: AdjustmentTypeSchema,
  component: ComponentSchema,
  value: decimal,
  target: AdjustmentTargetSchema,
  targetParams: z
    .record(z.string(), z.union([z.number(), z.array(z.number())]))
    .nullable(),
  reason: z.string(),
  status: BatchStatusSchema,
  affected: z.number(),
  capped: z.number(),
  createdBy: z.string(),
  creatorRole: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  createdAt: z.string(),
})

export const AdjustmentStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPLIED",
  "REJECTED",
  "REVERTED",
  "SUPERSEDED",
])

// Single-row adjustments (PATCH /results/grades/:id/adjust) — no batch.
export const SingleAdjustmentSchema = z.object({
  id: z.number(),
  gradeId: z.number(),
  matricNumber: z.string(),
  component: ComponentSchema,
  mode: z.enum(["ADD", "SET"]),
  value: decimal,
  appliedDelta: decimalOrNull,
  capped: z.boolean(),
  reason: z.string(),
  status: AdjustmentStatusSchema,
  createdBy: z.string(),
  createdAt: z.string(),
})

// GET /results/offerings/:id/adjustments (backend deviation, documented):
// batches and single-row adjustments come back as two lists.
export const AdjustmentHistorySchema = z.object({
  batches: z.array(AdjustmentBatchSchema),
  singles: z.array(SingleAdjustmentSchema),
})

// ─── Publishing ───────────────────────────────────────────────────────────────

export const PublishPreviewSchema = z.object({
  semesterId: z.number(),
  programs: z.array(
    z.object({
      programId: z.number(),
      programName: z.string(),
      approved: z.number(),
      wouldPublish: z.number(),
      wouldWithhold: z.number(),
    })
  ),
  sheetsNotApproved: z.number(),
  feeGateEnabled: z.boolean(),
})

// `sheetsAffected` is new in C7; the live endpoint predates it, so it is
// optional until the backend ships it (logged in BACKEND_DEVIATIONS).
export const PublishResultSchema = z.object({
  semesterId: z.number(),
  published: z.number(),
  withheld: z.number().optional(),
  sheetsAffected: z.number().optional(),
})

// ─── Configuration ────────────────────────────────────────────────────────────

export const GradingSchemeTypeSchema = z.enum([
  "CREDIT_WEIGHTED_GPA",
  "SIMPLE_AVERAGE",
  "PASS_FAIL",
])

export const SchemeGradeScaleSchema = z.object({
  id: z.number(),
  grade: z.string(),
  minScore: decimal,
  maxScore: decimal,
  gradePoint: decimalOrNull,
  description: z.string().nullable().optional(),
})

// `isValid` / `problems` are the server's own C4 validity check (a scheme
// must be valid to become a policy default or program override).
export const GradingSchemeSchema = z.object({
  id: z.number(),
  name: z.string(),
  schemeType: GradingSchemeTypeSchema,
  passMark: decimalOrNull,
  caWeightPercent: decimalOrNull,
  examWeightPercent: decimalOrNull,
  isActive: z.boolean(),
  majorProgramId: z.number().nullable(),
  isValid: z.boolean(),
  problems: z.array(z.string()),
  gradeScales: z.array(SchemeGradeScaleSchema).optional(),
})

export const SchemeResolutionSchema = z.object({
  scheme: GradingSchemeSchema.nullable(),
  source: z.enum(["PROGRAM", "MAJOR_PROGRAM", "UNRESOLVED"]),
})

export const TotalRoundingSchema = z.enum(["NONE", "HALF_UP_INTEGER"])

export const ResultPolicySchema = z.object({
  majorProgramId: z.number(),
  defaultGradingSchemeId: z.number().nullable(),
  feeGateEnabled: z.boolean(),
  adjustmentApprovalThreshold: decimalOrNull,
  totalRounding: TotalRoundingSchema,
  autoPullEnabled: z.boolean(),
})

// ─── Student ──────────────────────────────────────────────────────────────────

// The ONLY grade shape a student ever renders (C8). No status, no raw
// scores, no adjustments, no remarks. `publishedAt` is nullable only for the
// §14 fallback path (legacy rows carry no publish timestamp).
export const StudentGradeSchema = z.object({
  id: z.number(),
  courseCode: z.string(),
  courseTitle: z.string(),
  creditUnits: z.number(),
  semesterId: z.number(),
  semesterName: z.string(),
  academicSession: z.string(),
  caScore: decimalOrNull,
  examScore: decimalOrNull,
  totalScore: decimalOrNull,
  grade: z.string().nullable(),
  gradePoint: decimalOrNull,
  publishedAt: z.string().nullable(),
})

// Legacy `GET /results/grades/student/:id` row (pre-contract shape). Used
// only by the §14 fallback, which keeps PUBLISHED rows and maps them onto
// StudentGrade — the status never reaches a component.
export const LegacyStudentGradeRowSchema = z.object({
  id: z.number(),
  semesterId: z.number(),
  caScore: decimalOrNull,
  examScore: decimalOrNull,
  totalScore: decimalOrNull,
  gradePoint: decimalOrNull,
  status: GradeStatusSchema,
  course: z
    .object({
      code: z.string().optional(),
      title: z.string().optional(),
      creditUnits: z.number().optional(),
    })
    .nullish(),
  semester: z
    .object({
      name: z.string().optional(),
      academicSession: z.object({ name: z.string().optional() }).nullish(),
    })
    .nullish(),
  gradeScale: z.object({ grade: z.string().optional() }).nullish(),
})

export const ResultStatusSchema = z.object({
  semesterId: z.number(),
  published: z.boolean(),
  withheld: z.boolean(),
  reason: z.enum(["OUTSTANDING_FEES"]).nullable(),
})

// ─── Request bodies (C7) ──────────────────────────────────────────────────────

export const PullRequestSchema = z.object({
  semesterId: z.number().int().positive(),
  majorProgramId: z.number().int().positive().optional(),
  courseOfferingIds: z.array(z.number().int().positive()).optional(),
})

export const MapGradeItemSchema = z.object({
  component: z.enum(["CA", "EXAM", "EXCLUDED"]),
})

const REASON_MIN = 10
const reasonField = z
  .string()
  .trim()
  .min(REASON_MIN, `Give a reason of at least ${REASON_MIN} characters.`)

export const ApproveSheetSchema = z.object({
  remarks: z.string().trim().max(500).optional(),
})

export const RejectSheetSchema = z.object({
  remarks: z.string().trim().min(1, "Say why the sheet is being rejected."),
})

export const ReopenSheetSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to reopen."),
})

export const AdjustmentCreateSchema = z
  .object({
    type: AdjustmentTypeSchema,
    component: ComponentSchema,
    value: z.number({ error: "Enter a number of marks." }),
    target: AdjustmentTargetSchema,
    targetParams: z
      .object({
        belowTotal: z.number().optional(),
        studentIds: z.array(z.number().int().positive()).optional(),
      })
      .optional(),
    reason: reasonField,
  })
  .superRefine((body, ctx) => {
    if (body.target === "BELOW_TOTAL" && body.targetParams?.belowTotal == null)
      ctx.addIssue({
        code: "custom",
        path: ["targetParams", "belowTotal"],
        message: "Enter the total that students must be below.",
      })
    if (
      body.target === "SELECTED" &&
      (body.targetParams?.studentIds?.length ?? 0) === 0
    )
      ctx.addIssue({
        code: "custom",
        path: ["targetParams", "studentIds"],
        message: "Select at least one student.",
      })
    if (body.type === "SET_MISSING" && body.value < 0)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "A filled-in score can't be negative.",
      })
  })

export const SingleAdjustSchema = z.object({
  component: ComponentSchema,
  mode: z.enum(["ADD", "SET"]),
  value: z.number({ error: "Enter a number of marks." }),
  reason: reasonField,
})

export const BatchApproveSchema = z.object({
  note: z.string().trim().max(500).optional(),
})

export const BatchRejectSchema = z.object({
  note: z.string().trim().min(1, "A note is required to reject."),
})

export const RevertSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required to revert."),
})

export const PublishRequestSchema = z.object({
  majorProgramId: z.number().int().positive().optional(),
  programId: z.number().int().positive().optional(),
  courseOfferingIds: z.array(z.number().int().positive()).optional(),
})

export const GradingSchemeFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name the scheme.").max(100),
    schemeType: GradingSchemeTypeSchema,
    passMark: z.number().min(0).max(100).nullable(),
    caWeightPercent: z.number().min(0).max(100).nullable(),
    examWeightPercent: z.number().min(0).max(100).nullable(),
    isActive: z.boolean(),
    majorProgramId: z.number().int().positive().nullable(),
  })
  .superRefine((s, ctx) => {
    if (s.schemeType === "PASS_FAIL") {
      if (s.passMark == null)
        ctx.addIssue({
          code: "custom",
          path: ["passMark"],
          message: "A pass/fail scheme needs a pass mark.",
        })
      return
    }
    if (s.caWeightPercent == null || s.examWeightPercent == null) {
      ctx.addIssue({
        code: "custom",
        path: ["caWeightPercent"],
        message: "Set both the CA and exam weights.",
      })
      return
    }
    if (s.caWeightPercent + s.examWeightPercent !== 100)
      ctx.addIssue({
        code: "custom",
        path: ["examWeightPercent"],
        message: "CA and exam weights must add up to 100.",
      })
  })

export const GradeScaleFormSchema = z
  .object({
    grade: z.string().trim().min(1, "Enter a grade letter.").max(2),
    minScore: z.number().min(0).max(100),
    maxScore: z.number().min(0).max(100),
    gradePoint: z.number().min(0).max(10).nullable(),
    description: z.string().trim().max(50).optional(),
  })
  .refine((s) => s.maxScore >= s.minScore, {
    path: ["maxScore"],
    message: "Max score must be at least the min score.",
  })

// Validates a scheme's full band set: contiguous 0–100, no overlap (C4).
// Matches the backend rule: each band starts exactly 0.01 above the previous
// max (39.99 → 40.00); anything else is a gap or an overlap.
export const GradeScaleSetSchema = z
  .array(
    z.object({ grade: z.string(), minScore: z.number(), maxScore: z.number() })
  )
  .superRefine((scales, ctx) => {
    if (scales.length === 0) return
    const sorted = [...scales].sort((a, b) => a.minScore - b.minScore)
    if (sorted[0].minScore !== 0)
      ctx.addIssue({
        code: "custom",
        message: `The lowest band (${sorted[0].grade}) must start at 0.`,
      })
    if (sorted[sorted.length - 1].maxScore < 100)
      ctx.addIssue({
        code: "custom",
        message: `The highest band (${sorted[sorted.length - 1].grade}) must reach 100.`,
      })
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      if (cur.minScore <= prev.maxScore)
        ctx.addIssue({
          code: "custom",
          message: `${prev.grade} and ${cur.grade} overlap.`,
        })
      else if (Math.abs(cur.minScore - (prev.maxScore + 0.01)) > 1e-9)
        ctx.addIssue({
          code: "custom",
          message: `There's a gap between ${prev.grade} and ${cur.grade}.`,
        })
    }
  })

export const ProgramSchemeOverrideSchema = z.object({
  gradingSchemeId: z.number().int().positive().nullable(),
})

export const ResultPolicyFormSchema = z.object({
  defaultGradingSchemeId: z.number().int().positive().nullable(),
  feeGateEnabled: z.boolean(),
  adjustmentApprovalThreshold: z.number().min(0).max(100).nullable(),
  totalRounding: TotalRoundingSchema,
  autoPullEnabled: z.boolean(),
})

// ─── Error bodies ─────────────────────────────────────────────────────────────

// 409 `{message, code}`, 422 Laravel `{message, errors: {field: [..]}}`.
export const ApiErrorBodySchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})
