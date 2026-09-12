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
