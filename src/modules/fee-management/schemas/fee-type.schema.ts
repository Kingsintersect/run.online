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

export const GenerationStatusResponseSchema = z.object({
  feeTypeId: z.number(),
  jobId: z.string(),
  status: z.enum(["QUEUED", "RUNNING", "DONE", "FAILED"]),
  processed: z.number(),
  total: z.number(),
  failures: z.number(),
})

export const EligibleCountResponseSchema = z.object({
  count: z.number(),
})
