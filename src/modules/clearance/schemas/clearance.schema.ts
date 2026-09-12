import { z } from "zod"

export const ClearanceStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"])

// The summary endpoint (GET /clearance/student/:studentId/status) synthesizes
// a fourth, non-persisted status for a checkpoint the student hasn't
// requested yet — clearance_workflow.md §4: "No record? -> NOT_REQUESTED".
export const ClearanceSummaryStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NOT_REQUESTED",
])

export const ClearanceTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// Nested on StudentClearance records — confirmed present (as {name}, no id
// shown) on the POST /clearance response per Clearance - Request.bru; kept
// fully optional here since GET /clearance (list) / GET /clearance/:id
// aren't shown with a body example, so the UI must not assume it's always
// populated.
const NestedClearanceTypeSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
})

// Not confirmed by any bruno example body — GET /clearance (the staff/admin
// queue) needs to show which student a request belongs to, so this is kept
// fully optional and the UI falls back to "Student #{id}" if absent, same
// discipline as the Curriculum Planner's Level display elsewhere in this app.
const NestedStudentSchema = z.object({
  id: z.number().optional(),
  matricNumber: z.string().optional(),
  user: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
    })
    .optional(),
})

export const StudentClearanceSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  clearanceTypeId: z.number(),
  status: ClearanceStatusSchema,
  requestedAt: z.string(),
  approverId: z.number().nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  clearanceType: NestedClearanceTypeSchema.optional(),
  student: NestedStudentSchema.optional(),
})

export const ClearanceSummaryItemSchema = z.object({
  clearanceType: z.object({ id: z.number(), name: z.string() }),
  status: ClearanceSummaryStatusSchema,
  approverId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  comments: z.string().nullable(),
})

export const ClearanceSummarySchema = z.object({
  studentId: z.number(),
  totalRequired: z.number(),
  totalCleared: z.number(),
  isFullyCleared: z.boolean(),
  clearances: z.array(ClearanceSummaryItemSchema),
})

export const ClearanceQueryFiltersSchema = z.object({
  studentId: z.number().optional(),
  typeId: z.number().optional(),
  status: ClearanceStatusSchema.optional(),
})

export const CreateClearanceTypeDtoSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters"),
  description: z.string().optional(),
})

export const UpdateClearanceTypeDtoSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
})

export const RequestClearanceDtoSchema = z.object({
  studentId: z.number(),
  clearanceTypeId: z.number(),
})

export const ApproveClearanceDtoSchema = z.object({
  comments: z.string().optional(),
})

export const RejectClearanceDtoSchema = z.object({
  comments: z.string().min(1, "A reason is required for rejection"),
})
