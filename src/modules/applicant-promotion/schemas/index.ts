import { z } from "zod"

// ─── Applicant → Student promotion — schemas ──────────────────────────────
//
// POST /users/students/promote/:userId (QHUB bruno/user/Students - Promote.bru)
// — no body. `:userId` is the applicant's USER id (`whereNumber`), which the
// application review response carries as `applicant_id` (= the
// AdmissionApplication's userId, per sandbox/admission/admission_README.md).

/** Path param only — validated before dispatch so a bad id never hits the wire. */
export const PromoteApplicantParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
})

/**
 * The subset of StudentResource this action reads (bruno/user/Students -
 * Show.bru). Everything beyond `id` is optional so an older/leaner
 * resource still parses; extra keys are stripped.
 */
export const PromotedStudentSchema = z.object({
  id: z.number(),
  userId: z.number().optional(),
  matricNumber: z.string().nullable().optional(),
  status: z.string().optional(),
})

/** Laravel resources normally answer `{data: …}`; accept a bare resource too. */
export const PromoteApplicantResponseSchema = z.union([
  z.object({ data: PromotedStudentSchema }),
  PromotedStudentSchema,
])

/** The standard Laravel error body (message + optional field errors). */
export const PromotionErrorBodySchema = z.object({
  message: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})
