/* ------------------------------------------------------------------ */
/*  Runtime validation for dynamic application form fields            */
/*  sandbox/dynamic-admission/ — client-side checks generated from the */
/*  admin's field definitions. The backend re-validates the same rules */
/*  (API_CONTRACTS.md §3.4).                                            */
/* ------------------------------------------------------------------ */

import { z } from "zod"
import { isDocumentFile, isImageFile } from "@/lib/uploads"
import type { AdmissionFormField } from "@/types/admissionConfig"
import type { DynamicFieldValue, DynamicRow } from "./dynamic-form"

const DEFAULT_MAX_FILE_MB = 5

export function isEmptyValue(value: DynamicFieldValue): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "number" && Number.isNaN(value)) ||
    (Array.isArray(value) && value.length === 0)
  )
}

function fileSchema(field: AdmissionFormField): z.ZodType<File> {
  const v = field.validation
  const maxMb = v?.maxSizeMb ?? DEFAULT_MAX_FILE_MB
  const accept = v?.accept ?? "ANY"
  return z
    .instanceof(File, { message: `${field.label} must be a file` })
    .refine((file) => file.size <= maxMb * 1024 * 1024, {
      message: `${field.label} must be ${maxMb} MB or smaller`,
    })
    .refine(
      (file) =>
        accept === "ANY" ||
        (accept === "IMAGE"
          ? isImageFile(file)
          : isImageFile(file) || isDocumentFile(file)),
      {
        message:
          accept === "IMAGE"
            ? `${field.label} must be an image`
            : `${field.label} must be an image, PDF, DOC or DOCX file`,
      }
    )
}

function baseSchema(field: AdmissionFormField): z.ZodTypeAny {
  const v = field.validation
  const label = field.label

  switch (field.type) {
    case "NUMBER": {
      let num = z.number({ message: `${label} must be a number` })
      if (v?.min !== undefined)
        num = num.min(v.min, `${label} must be at least ${v.min}`)
      if (v?.max !== undefined)
        num = num.max(v.max, `${label} must be at most ${v.max}`)
      return num
    }
    case "YEAR":
      return z
        .union([z.string(), z.number()])
        .refine(
          (year) => /^\d{4}$/.test(String(year)),
          `${label} must be a 4-digit year`
        )
        .refine(
          (year) => v?.min === undefined || Number(year) >= v.min,
          `${label} must be ${v?.min} or later`
        )
        .refine(
          (year) => v?.max === undefined || Number(year) <= v.max,
          `${label} must be ${v?.max} or earlier`
        )
    case "DATE":
      return z
        .string()
        .refine(
          (date) => !v?.minDate || date >= v.minDate,
          `${label} must be on or after ${v?.minDate}`
        )
        .refine(
          (date) => !v?.maxDate || date <= v.maxDate,
          `${label} must be on or before ${v?.maxDate}`
        )
    case "EMAIL":
      return z.string().email(`${label} must be a valid email address`)
    case "BOOLEAN":
      return z.boolean({ message: `${label} must be yes or no` })
    case "SELECT":
    case "RADIO":
      return z
        .string({ message: `Choose ${label.toLowerCase()}` })
        .refine(
          (choice) =>
            !!field.optionsSource ||
            !field.options?.length ||
            field.options.some((o) => o.value === choice),
          `Choose one of the options for ${label.toLowerCase()}`
        )
    case "MULTISELECT":
      return z.array(z.string())
    case "FILE":
      return v?.multiple
        ? z
            .array(fileSchema(field))
            .max(v.maxItems ?? 20, `Upload at most ${v.maxItems ?? 20} files`)
        : fileSchema(field)
    case "TEXT":
    case "TEXTAREA":
    case "PHONE":
    default: {
      let str = z.string({ message: `${label} must be text` })
      const minLength = v?.minLength ?? v?.min
      const maxLength = v?.maxLength ?? v?.max
      if (minLength !== undefined)
        str = str.min(
          minLength,
          `${label} must be at least ${minLength} characters`
        )
      if (maxLength !== undefined)
        str = str.max(
          maxLength,
          `${label} must be at most ${maxLength} characters`
        )
      if (v?.pattern)
        str = str.regex(
          new RegExp(v.pattern),
          `${label} isn't in the expected format`
        )
      return str
    }
  }
}

const isRowList = (value: DynamicFieldValue): value is DynamicRow[] =>
  Array.isArray(value) &&
  value.every(
    (row) => typeof row === "object" && row !== null && !(row instanceof File)
  )

/**
 * The first problem with `value` for this field, or null when it's fine.
 * A BOOLEAN is always "answered" (it defaults to No), so `isRequired`
 * doesn't force it to Yes.
 */
export function validateFieldValue(
  field: AdmissionFormField,
  value: DynamicFieldValue,
  children: AdmissionFormField[] = []
): string | null {
  if (isEmptyValue(value)) {
    return field.isRequired && field.type !== "BOOLEAN"
      ? `${field.label} is required`
      : null
  }

  if (field.type === "REPEATING_GROUP") {
    if (!isRowList(value)) return `${field.label} is invalid`
    const maxItems = field.validation?.maxItems
    if (maxItems !== undefined && value.length > maxItems) {
      return `Add at most ${maxItems} entries to ${field.label.toLowerCase()}`
    }
    for (const [i, row] of value.entries()) {
      for (const child of children) {
        const message = validateFieldValue(child, row[child.key])
        if (message) return `${message} (entry ${i + 1})`
      }
    }
    return null
  }

  const result = baseSchema(field).safeParse(value)
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? `${field.label} is invalid`)
}
