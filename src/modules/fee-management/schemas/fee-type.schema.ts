import { z } from "zod"
import { FeeCategorySchema, StudentTypeSchema } from "./common.schema"

// Cohort-based categories that require a session
const COHORT_CATEGORIES = ["TUITION", "HOSTEL", "CLEARANCE"] as const

const FeeTypeDtoBaseSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  description: z.string().max(1000).optional(),
  category: FeeCategorySchema,
  amount: z.coerce.number().positive("Amount must be a positive number"),
  sessionId: z.number().int().positive().optional(),
  // Major-Program Scoping — sandbox/major-program-scoping/SCHEMA_CHANGES.md
  // §2a (new capability, not yet built — flagged in
  // BACKEND_DEVIATIONS_2026-09-14.md A12). Distinct from `programId`: this
  // scopes to "every program under this major program" without pinning one
  // exact program. Sent to the backend now so it starts working the day
  // A12 ships, with no frontend change needed then.
  majorProgramId: z.number().int().positive().optional(),
  programId: z.number().int().positive().optional(),
  levelId: z.number().int().positive().optional(),
  studentType: StudentTypeSchema.default("ALL"),
  isMandatory: z.boolean().default(true),
  allowInstallments: z.boolean().default(false),
  defaultDueDate: z.string().datetime({ offset: true }).optional(),
})

export const CreateFeeTypeDtoSchema = FeeTypeDtoBaseSchema.superRefine(
  (data, ctx) => {
    if (
      (COHORT_CATEGORIES as readonly string[]).includes(data.category) &&
      !data.sessionId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sessionId"],
        message: "Session is required for tuition, hostel, and clearance fees",
      })
    }
  }
)

export const UpdateFeeTypeDtoSchema = FeeTypeDtoBaseSchema.partial()

// z.input (pre-.default()) vs z.infer (post-.default()) differ for
// studentType/isMandatory/allowInstallments — react-hook-form's useForm
// needs the input type as its form-values generic, with zodResolver
// producing the (required) output type. See fee-type-form.tsx.
export type CreateFeeTypeInputValues = z.input<typeof CreateFeeTypeDtoSchema>

export const FeeTypeResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category: FeeCategorySchema,
  amount: z.string(), // Decimal serialized as string from backend — use Number() only for display
  sessionId: z.number().nullable(),
  session: z.object({ id: z.number(), name: z.string() }).nullable(),
  // Optional/defaulted rather than required — see A12: not returned by the
  // live backend yet, so a response missing it entirely still parses.
  majorProgramId: z.number().nullable().optional().default(null),
  majorProgram: z
    .object({ id: z.number(), name: z.string() })
    .nullable()
    .optional()
    .default(null),
  programId: z.number().nullable(),
  program: z.object({ id: z.number(), name: z.string() }).nullable(),
  levelId: z.number().nullable(),
  level: z.object({ id: z.number(), name: z.string() }).nullable(),
  studentType: StudentTypeSchema,
  isMandatory: z.boolean(),
  allowInstallments: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
})

export const ActivateFeeTypeResponseSchema = z.object({
  feeTypeId: z.number(),
  jobId: z.string(),
  eligibleStudentCount: z.number(),
  status: z.literal("QUEUED"),
})

// bruno/fee/Fee Types - Generation Status.bru (Part D, 2026-09-15): read
// straight off FeeTypeController::generationStatus(), wrapped in `{ data }`.
// Counts are rendered as `?? 0` while QUEUED/RUNNING, as the note asks.
export const GenerationStatusResponseSchema = z.object({
  feeTypeId: z.number(),
  jobId: z.union([z.number(), z.string()]),
  status: z.enum(["QUEUED", "RUNNING", "DONE", "FAILED"]),
  eligibleCount: z.number().nullish(),
  processedCount: z.number().nullish(),
  /** Invoices actually created. */
  createdCount: z.number().nullish(),
  /** Students who already had an invoice for this fee type. */
  skippedCount: z.number().nullish(),
  /** Set only when status is FAILED. */
  error: z.string().nullish(),
})

export const EligibleCountResponseSchema = z.object({
  count: z.number(),
})
