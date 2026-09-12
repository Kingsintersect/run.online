import { z } from "zod"

export const AssessmentTypeSchema = z.enum(["assignment", "quiz", "forum"])

// ── Normalized assessment ─────────────────────────────────────────────────────
// `GET /assessments/*` returns two wire shapes over one entity:
//   • list / my / upcoming / course/:id  →  flat `course: { code, title, semesterName }`
//   • GET /assessments/:id (detail)       →  deep `course.courseOffering.{course,
//                                             semester,academicSession}` + sync metadata
// The service maps both into this single shape (see `mapAssessmentListItem` /
// `mapAssessmentDetail` in moodle-sync.service.ts). Detail-only fields are
// `null` on rows that came from a list endpoint.
export const AssessmentResponseSchema = z.object({
  id: z.number(),
  assessmentType: AssessmentTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  maxGrade: z.number().nullable(),
  isVisible: z.boolean(),
  courseCode: z.string(),
  courseTitle: z.string(),
  semesterName: z.string().nullable(),
  academicSessionName: z.string().nullable(),
  // detail-only
  moodleSyncCourseId: z.number().nullable(),
  moodleAssessmentId: z.number().nullable(),
  moodleShortName: z.string().nullable(),
  moodleFullName: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
})

export const AssessmentListResponseSchema = z.object({
  data: z.array(AssessmentResponseSchema),
})

// ── Filters / pagination ──────────────────────────────────────────────────
// `GET /assessments` accepts type / offeringId / semesterId / isVisible /
// upcoming / page / limit (assesments_README.md) and returns `meta`.

export const AssessmentFilterSchema = z.object({
  type: AssessmentTypeSchema.optional(),
  courseOfferingId: z.number().optional(),
  semesterId: z.number().optional(),
  isVisible: z.boolean().optional(),
  upcoming: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

export const PaginatedAssessmentsSchema = z.object({
  data: z.array(AssessmentResponseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
})

// ── Visibility ─────────────────────────────────────────────────────────────
// PATCH /assessments/:id/visibility — Admin / Lecturer.

export const UpdateVisibilitySchema = z.object({
  isVisible: z.boolean(),
})

export const VisibilityResponseSchema = z.object({
  id: z.number(),
  isVisible: z.boolean(),
  updatedAt: z.string().optional(),
})

// ── Sync result / status ───────────────────────────────────────────────────
// POST /assessments/sync/:moodleCourseId — Admin.
// GET  /assessments/sync/status — Admin.

export const SyncResultSchema = z.object({
  moodleCourseId: z.number(),
  pulled: z.number(),
  created: z.number().optional(),
  updated: z.number().optional(),
  failed: z.number().optional(),
})

export const SyncStatusSchema = z.object({
  summary: z.object({
    totalCourses: z.number(),
    totalAssessments: z.number(),
    byStatus: z.object({
      SYNCED: z.number(),
      PENDING: z.number(),
      FAILED: z.number(),
      STALE: z.number(),
    }),
  }),
  courses: z.array(
    z.object({
      courseOfferingId: z.number(),
      courseCode: z.string(),
      moodleCourseId: z.number(),
      assessmentCount: z.number(),
      lastSyncAt: z.string().nullable(),
      failedCount: z.number(),
    })
  ),
})

// ── CA preview (Moodle → Grade.caScore bridge) ────────────────────────────
// GET /moodle-sync/assessments/ca-preview/:offeringId — NOT YET SHIPPED
// (sandbox/API_GAPS_2026-09.md §2 / MISSING_BACKEND_APIS.md §2.14). The
// "Pull CA from Moodle" button degrades to an error toast until it exists.

export const CaPreviewItemSchema = z.object({
  studentId: z.number(),
  studentName: z.string(),
  studentMatric: z.string(),
  sourceItemCount: z.number(),
  sourceTotal: z.number(),
  sourceMax: z.number(),
  computedCaScore: z.number(),
})

export const CaPreviewResponseSchema = z.object({
  offeringId: z.number(),
  semesterId: z.number(),
  caMax: z.number(),
  students: z.array(CaPreviewItemSchema),
})
