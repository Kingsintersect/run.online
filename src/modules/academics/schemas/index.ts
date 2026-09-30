import { z } from "zod"
import { majorProgramSchema, offeringSchema } from "@/schemas/school.schema"

// Academics-module form schemas that extend the shared ones in
// src/schemas/school.schema.ts with the 2026-09-28 contract changes (B25).

export const TERM_STRUCTURES = ["SEMESTER", "SESSION"] as const

// bruno/academic/Major Programs - Create/Update.bru: optional
// `termStructure`, "SEMESTER" by default.
export const majorProgramFormSchema = majorProgramSchema.extend({
  termStructure: z.enum(TERM_STRUCTURES),
})

export type MajorProgramFormValues = z.infer<typeof majorProgramFormSchema>

// bruno/course/Offering - Create.bru: `semesterId` is required only when the
// session belongs to a SEMESTER-structured major program. For a
// SESSION-structured one it is omitted and the server uses the session's
// auto-managed "Full Session" semester. `requires_semester` is a form-only
// flag set from the selected session's term structure; it is never sent.
export const offeringFormSchema = offeringSchema
  .extend({
    semester_id: z.number().int().optional(),
    requires_semester: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (
      values.requires_semester &&
      !(values.semester_id && values.semester_id > 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["semester_id"],
        message: "Select a semester",
      })
    }
  })

export type OfferingFormValues = z.infer<typeof offeringFormSchema>
