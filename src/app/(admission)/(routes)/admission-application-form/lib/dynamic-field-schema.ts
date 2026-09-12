/* ------------------------------------------------------------------ */
/*  Runtime Zod schema generation for dynamic application form fields  */
/*  Multi-Program Platform — sandbox/multi-program-platform/           */
/*                                                                     */
/*  Turns one AdmissionFormField's isRequired/validation into a Zod    */
/*  schema, and a step's whole field list into one z.object() — client */
/*  -side validation generated from admin config instead of a          */
/*  hand-written per-step schema. The backend re-validates the same    */
/*  way it already does for every other application field (see         */
/*  API_CONTRACTS.md §B).                                              */
/* ------------------------------------------------------------------ */

import { z } from "zod"
import type { AdmissionFormField } from "@/types/admissionConfig"

export function buildFieldSchema(field: AdmissionFormField): z.ZodTypeAny {
  const v = field.validation

  let schema: z.ZodTypeAny
  switch (field.type) {
    case "NUMBER": {
      let num = z.number({ message: `${field.label} must be a number` })
      if (v?.min !== undefined) num = num.min(v.min)
      if (v?.max !== undefined) num = num.max(v.max)
      schema = num
      break
    }
    case "EMAIL": {
      schema = z.string().email(`${field.label} must be a valid email`)
      break
    }
    case "DATE": {
      let date: z.ZodTypeAny = z.string()
      // String bounds (.min()/.max()) check length, not calendar order —
      // date range bounds need their own comparison.
      if (v?.minDate) {
        const minDate = v.minDate
        date = date.refine((d: unknown) => String(d) >= minDate, {
          message: `${field.label} must be on or after ${minDate}`,
        })
      }
      if (v?.maxDate) {
        const maxDate = v.maxDate
        date = date.refine((d: unknown) => String(d) <= maxDate, {
          message: `${field.label} must be on or before ${maxDate}`,
        })
      }
      schema = date
      break
    }
    case "MULTISELECT":
      schema = z.array(z.string())
      break
    case "REPEATING_GROUP":
      schema = z.array(z.record(z.string(), z.unknown()))
      break
    case "FILE":
      // Accepts either a fresh File (new upload) or a string (an already-
      // uploaded document's URL/id, for edit flows) — validated more
      // strictly server-side.
      schema = z.union([z.instanceof(File), z.string()])
      break
    default: {
      let str = z.string()
      if (v?.min !== undefined) str = str.min(v.min)
      if (v?.max !== undefined) str = str.max(v.max)
      if (v?.pattern) str = str.regex(new RegExp(v.pattern))
      schema = str
    }
  }

  if (!field.isRequired) {
    schema = schema.optional().nullable()
  }
  return schema
}

/** One z.object() covering every field a resolved step asks — the shape
 *  `custom_fields[step.key]` (or however the wizard keys it) validates
 *  against before submission. */
export function buildStepSchema(
  fields: AdmissionFormField[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    shape[field.key] = buildFieldSchema(field)
  }
  return z.object(shape)
}
