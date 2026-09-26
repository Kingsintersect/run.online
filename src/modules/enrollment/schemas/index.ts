import { z } from "zod"

export const EnrollmentStatusSchema = z.enum([
  "ENROLLED",
  "DROPPED",
  "WITHDRAWN",
])
export const AttendanceStatusSchema = z.enum([
  "present",
  "absent",
  "late",
  "excused",
])

export const CreateEnrollmentSchema = z.object({
  studentId: z.number().int().positive(),
  offeringId: z.number().int().positive(),
  semesterId: z.number().int().positive(),
})

export const BulkEnrollSchema = z.object({
  studentId: z.number().int().positive(),
  offeringIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one course offering"),
  semesterId: z.number().int().positive(),
})

export const DropEnrollmentSchema = z.object({
  reason: z
    .string()
    .max(255, "Keep the reason under 255 characters")
    .optional(),
})

export const EnrollmentFilterSchema = z.object({
  semesterId: z.number().int().optional(),
  studentId: z.number().int().optional(),
  offeringId: z.number().int().optional(),
  status: EnrollmentStatusSchema.optional(),
  // Major-Program Scoping — not confirmed live on this endpoint. Sent
  // speculatively per CLAUDE.md §14; see BACKEND_DEVIATIONS_2026-09-14.md
  // A14. This list is paginated, so nothing re-filters client-side against
  // a possibly-incomplete page once results come back.
  majorProgramId: z.number().int().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export const RecordAttendanceSchema = z.object({
  studentId: z.number().int().positive(),
  scheduleId: z.number().int().positive(),
  attendanceDate: z.string().min(1, "Date is required"),
  status: AttendanceStatusSchema,
  remarks: z.string().max(255).optional(),
})

export const BulkAttendanceSchema = z.object({
  scheduleId: z.number().int().positive(),
  attendanceDate: z.string().min(1, "Date is required"),
  records: z.array(
    z.object({
      studentId: z.number().int().positive(),
      status: AttendanceStatusSchema,
      remarks: z.string().max(255).optional(),
    })
  ),
})

export const UpdateAttendanceSchema = z.object({
  status: AttendanceStatusSchema.optional(),
  remarks: z.string().max(255).optional(),
})

// ─── Session registration (RegistrationContext) ─────────────────────────────
// Shape per sandbox/accademic-session-semester-migration/
// session-promotion-frontend-prompt.md §"Shared API contract" — the backend
// decides standing, carryovers, eligibility and limits; the frontend only
// renders them. Decimal fields accept a string or number because Laravel
// serialises decimals either way depending on casts.

const DecimalSchema = z.union([z.string(), z.number()]).nullable()

const NamedRefSchema = z.object({ id: z.number(), name: z.string() })

const LevelRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  numeric_value: z.number().nullable().optional(),
})

export const StandingOutcomeSchema = z.enum([
  "PENDING",
  "PROMOTED",
  "PROMOTED_WITH_CARRYOVER",
  "PROMOTED_ON_PROBATION",
  "REPEAT_LEVEL",
  "SPILLOVER",
  "GRADUATING",
  "ADVISED_TO_WITHDRAW",
  "NOT_EVALUATED",
  "WITHHELD",
])

export const RegistrationStatusSchema = z.enum([
  "NOT_REGISTERED",
  "REGISTERED",
  "DEFERRED",
])

export const FinancialStatusSchema = z.enum([
  "CLEARED",
  "OWING",
  "OWING_ALLOWED",
  "WAIVED",
])

export const SessionStandingSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  academic_session: NamedRefSchema,
  program: NamedRefSchema.extend({ code: z.string().nullable().optional() }),
  level: LevelRefSchema,
  next_level: LevelRefSchema.nullable(),
  registration_status: RegistrationStatusSchema,
  system_outcome: StandingOutcomeSchema,
  outcome: StandingOutcomeSchema,
  is_overridden: z.boolean(),
  override_reason: z.string().nullable(),
  gpa: DecimalSchema,
  cgpa: DecimalSchema,
  credit_units_earned: z.number().nullable().optional(),
  outstanding_carryover_units: z.number().nullable().optional(),
  financial_status: FinancialStatusSchema,
  outstanding_amount: DecimalSchema,
  debt_override: z
    .object({
      by: NamedRefSchema.nullable().optional(),
      at: z.string().nullable().optional(),
      reason: z.string().nullable().optional(),
    })
    .nullable(),
  state: z.enum(["OPEN", "FINALIZED", "VOIDED"]),
})

export const RegistrationGateInvoiceSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  session_name: z.string(),
  fee_type: z.string(),
  balance: z.union([z.string(), z.number()]),
})

export const RegistrationGateSchema = z.object({
  can_register: z.boolean(),
  blockers: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      invoices: z.array(RegistrationGateInvoiceSchema).optional(),
    })
  ),
})

const RegistrationCourseSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  credit_units: z.number(),
  course_type: z.string().nullable().optional(),
})

export const CarryoverCourseSchema = z.object({
  course: RegistrationCourseSchema,
  offering_id: z.number().nullable(),
  reason: z.enum(["FAILED", "NOT_TAKEN"]),
  last_attempt_session: z.string().nullable(),
  locked: z.boolean(),
  offering_missing: z.boolean(),
})

export const LevelCourseSchema = z.object({
  course: RegistrationCourseSchema,
  offering_id: z.number(),
  is_required: z.boolean(),
  prerequisites_met: z.boolean(),
  // The contract shows an empty array only; accept a course ref or a bare code.
  missing_prerequisites: z.array(
    z.union([
      z.string(),
      z.object({
        id: z.number().optional(),
        code: z.string(),
        title: z.string().optional(),
      }),
    ])
  ),
})

export const RegistrationContextSchema = z.object({
  semester: z.object({
    id: z.number(),
    name: z.string(),
    registration_start: z.string().nullable(),
    registration_end: z.string().nullable(),
    is_open: z.boolean(),
  }),
  standing: SessionStandingSchema.nullable(),
  previous_standing: SessionStandingSchema.nullable(),
  gate: RegistrationGateSchema,
  carryover_courses: z.array(CarryoverCourseSchema),
  level_courses: z.array(LevelCourseSchema),
  limits: z.object({
    max_units: z.number().nullable(),
    min_units: z.number().nullable(),
  }),
  registered_offering_ids: z.array(z.number()),
})

// Submit goes through the existing self-enrollment write endpoint
// (POST /enrollments, one per offering) — the contract keeps its path.
export const SubmitRegistrationSchema = z.object({
  studentId: z.number().int().positive(),
  semesterId: z.number().int().positive(),
  offeringIds: z
    .array(z.number().int().positive())
    .min(1, "Select at least one course to register"),
})
