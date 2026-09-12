import { z } from "zod"

// ─── Enums ───────────────────────────────────────────────────────────────────
// Faculty/Department/Level are NOT fixed unions — the real Faculty/Department/
// Level tables are admin-configurable (arbitrary count, arbitrary names), so
// filter values are validated as plain strings rather than a closed enum sized
// to the old 8-faculty mock. See director.types.ts's header comment and
// sandbox/MISSING_BACKEND_APIS.md §2.8.

export const SemesterEnum = z.enum(["First", "Second"])
export const PaymentStatusEnum = z.enum([
  "paid",
  "partial",
  "unpaid",
  "overdue",
])
export const GradePointEnum = z.enum(["A", "B", "C", "D", "E", "F"])

// ─── Filter Schema ───────────────────────────────────────────────────────────

export const DirectorFilterSchema = z.object({
  faculty: z.string().min(1).or(z.literal("all")).optional(),
  department: z.string().optional(),
  program: z.string().optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "Format: YYYY/YYYY")
    .optional(),
  semester: SemesterEnum.or(z.literal("all")).optional(),
  level: z.string().or(z.literal("all")).optional(),
  status: z.string().optional(),
  search: z.string().max(100).optional(),
})

// ─── Report Export Schema ────────────────────────────────────────────────────

export const ExportReportSchema = z.object({
  reportType: z.enum(["financial", "statistical", "grades", "overview"]),
  format: z.enum(["pdf", "csv", "xlsx"]),
  faculty: z.string().min(1).or(z.literal("all")).optional(),
  academicYear: z.string().optional(),
  semester: SemesterEnum.optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
})

export type DirectorFilterInput = z.infer<typeof DirectorFilterSchema>
export type ExportReportInput = z.infer<typeof ExportReportSchema>
