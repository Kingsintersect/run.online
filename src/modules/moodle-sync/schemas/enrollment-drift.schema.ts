import { z } from "zod"

// Enrollment Drift Check — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md.
//
// The portal is the authority for enrollments — nothing in this contract ever
// creates a portal enrollment.

export const EnrollmentDriftKindSchema = z.enum([
  "MISSING_IN_MOODLE",
  "ONLY_IN_MOODLE",
])

export const EnrollmentDriftStatusSchema = z.enum([
  "OPEN",
  "RESOLVED",
  "DISMISSED",
])

export const EnrollmentDriftResolutionSchema = z.enum([
  "RE_ENROLLED",
  "UNENROLLED_IN_MOODLE",
  "DISMISSED",
  "AUTO_CLEARED",
])

export const DriftScanStateSchema = z.enum([
  "IDLE",
  "RUNNING",
  "COMPLETED",
  "FAILED",
])

export const EnrollmentDriftItemSchema = z.object({
  id: z.number(),
  kind: EnrollmentDriftKindSchema,
  status: EnrollmentDriftStatusSchema,
  moodleCourseId: z.number(),
  courseOfferingId: z.number().nullable(),
  courseCode: z.string(),
  courseTitle: z.string(),
  studentEnrollmentId: z.number().nullable(),
  portalUserId: z.number().nullable(),
  moodleUserId: z.number().nullable(),
  studentName: z.string(),
  matricNumber: z.string().nullable(),
  email: z.string().nullable(),
  detectedAt: z.string(),
  lastSeenAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.number().nullable(),
  resolution: EnrollmentDriftResolutionSchema.nullable(),
  resolutionNote: z.string().nullable(),
})

export const EnrollmentDriftListSchema = z.object({
  data: z.array(EnrollmentDriftItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
})

export const EnrollmentDriftSummarySchema = z.object({
  open: z.object({
    missingInMoodle: z.number(),
    onlyInMoodle: z.number(),
  }),
  dismissed: z.number(),
  lastScanAt: z.string().nullable(),
  lastScanStatus: DriftScanStateSchema.nullable(),
})

export const DriftScanStatusSchema = z.object({
  status: DriftScanStateSchema,
  coursesTotal: z.number(),
  coursesChecked: z.number(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
})

export const CourseDriftCheckSchema = z.object({
  moodleCourseId: z.number(),
  courseOfferingId: z.number().nullable(),
  courseCode: z.string(),
  courseTitle: z.string(),
  checkedAt: z.string(),
  summary: z.object({
    inSync: z.number(),
    missingInMoodle: z.number(),
    onlyInMoodle: z.number(),
    // Existing FAILED/PENDING sync rows — context only, never drift items.
    failedPush: z.number(),
    pendingPush: z.number(),
  }),
  items: z.array(EnrollmentDriftItemSchema),
})

export const EnrollmentDriftFiltersSchema = z.object({
  status: EnrollmentDriftStatusSchema.optional(),
  kind: EnrollmentDriftKindSchema.optional(),
  moodleCourseId: z.number().int().positive().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

export const ResolveDriftReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Give a short reason (at least 5 characters)")
    .max(500, "Keep the reason under 500 characters"),
})
