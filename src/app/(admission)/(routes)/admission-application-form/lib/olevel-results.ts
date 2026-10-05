/* ------------------------------------------------------------------ */
/*  O'level (SSCE) results — sandbox/olevel-results/                   */
/*                                                                     */
/*  Pure logic behind the OLEVEL_RESULTS field type: reading the       */
/*  stored answer, the screening rule from the field's config, live    */
/*  credit counting, validation and the submit payload. The backend    */
/*  re-applies the same rules (API_CONTRACTS.md §3).                    */
/* ------------------------------------------------------------------ */

import { z } from "zod"
import {
  asFormFieldType,
  OLEVEL_CREDIT_GRADES,
  OLEVEL_DEFAULT_RULES,
  OLEVEL_EXAM_TYPES,
  OLEVEL_GRADES,
  OLEVEL_MAX_SITTINGS,
  OLEVEL_RESULTS_FIELD_TYPE,
  OLEVEL_SUBJECTS_PER_SITTING,
  olevelSubjectLabel,
} from "@/lib/admission-catalog"
import type { OlevelRules } from "@/schemas/admission-dynamic.schema"
import type {
  AdmissionFormField,
  FormFieldValidation,
} from "@/types/admissionConfig"
import type { FormDefaultValues } from "../types/form-types"
import type { DynamicFieldValue, ValueLookup } from "./dynamic-form"

// ── Stored answer ───────────────────────────────────────────────────

const text = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .catch("")

const subjectRowSchema = z.object({ subject: text, grade: text })

/**
 * One sitting as stored in the form and sent to the backend. Lenient: a
 * malformed draft degrades to blanks instead of throwing.
 */
export const olevelSittingSchema = z.object({
  exam_type: text,
  exam_year: text,
  exam_number: text,
  subjects: z.array(subjectRowSchema).catch([]),
})

export type OlevelSitting = z.infer<typeof olevelSittingSchema>
export type OlevelSubjectRow = OlevelSitting["subjects"][number]

/** The stored answer (a DynamicRow[]), typed. Anything unreadable becomes []. */
export function parseOlevelSittings(value: DynamicFieldValue): OlevelSitting[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || item instanceof File)
      return []
    return [olevelSittingSchema.parse(item)]
  })
}

// ── Context from the rest of the form ───────────────────────────────

export interface OlevelContext {
  /** "Are you awaiting your result?" — the grid isn't required while true. */
  awaitingResult: boolean
  /** The Result Type answer, if the form asks it. Drives how many sittings show. */
  resultType: "single_result" | "combined_result" | null
}

/** Reads the qualification answers wherever they live (hand-built or dynamic step). */
export function olevelContextFrom(lookup: ValueLookup): OlevelContext {
  const resultType = lookup("combined_result")
  return {
    awaitingResult: lookup("awaiting_result") === true,
    resultType:
      resultType === "single_result" || resultType === "combined_result"
        ? resultType
        : null,
  }
}

export function olevelContextFromValues(
  values: Pick<FormDefaultValues, "awaiting_result" | "combined_result">
): OlevelContext {
  return {
    awaitingResult: values.awaiting_result === true,
    resultType: values.combined_result || null,
  }
}

// ── Rule config ─────────────────────────────────────────────────────

const lenientRulesSchema = z.object({
  minCredits: z
    .number()
    .int()
    .min(1)
    .max(OLEVEL_SUBJECTS_PER_SITTING.max * OLEVEL_MAX_SITTINGS)
    .catch(OLEVEL_DEFAULT_RULES.minCredits),
  maxSittings: z
    .number()
    .int()
    .min(1)
    .max(OLEVEL_MAX_SITTINGS)
    .catch(OLEVEL_DEFAULT_RULES.maxSittings),
  requiredSubjects: z
    .array(z.string())
    .catch(OLEVEL_DEFAULT_RULES.requiredSubjects),
})

/** The field's screening rule, each missing/invalid key falling back to the default. */
export function readOlevelRules(
  field: Pick<AdmissionFormField, "validation">
): OlevelRules {
  return lenientRulesSchema.parse(field.validation ?? {})
}

// ── Fallback field definition ───────────────────────────────────────

/** Negative ids mark definitions the frontend made up — never sent as configured answers. */
export const FALLBACK_OLEVEL_FIELD_ID = -9001

/** FormFieldValidation plus the O'level rule keys it doesn't declare yet. */
export type OlevelFieldValidation = FormFieldValidation & Partial<OlevelRules>

const FALLBACK_OLEVEL_VALIDATION: OlevelFieldValidation = {
  minCredits: OLEVEL_DEFAULT_RULES.minCredits,
  maxSittings: OLEVEL_DEFAULT_RULES.maxSittings,
  requiredSubjects: OLEVEL_DEFAULT_RULES.requiredSubjects,
}

/**
 * Used whenever the resolved form asks about O'level sittings but has no
 * OLEVEL_RESULTS field configured (the backend's field-type enum doesn't
 * accept it yet — BACKEND_DEVIATIONS A52). A configured field always wins.
 */
export const FALLBACK_OLEVEL_FIELD: AdmissionFormField = {
  id: FALLBACK_OLEVEL_FIELD_ID,
  stepId: 0,
  key: "olevel_results",
  label: "O'level results",
  type: asFormFieldType(OLEVEL_RESULTS_FIELD_TYPE),
  order: 1000,
  isRequired: true,
  helpText:
    "Enter each subject and grade exactly as on your result. Add a second sitting only if you're combining two results.",
  options: null,
  validation: FALLBACK_OLEVEL_VALIDATION,
  repeatable: false,
  isActive: true,
  systemKey: "olevelResults",
  width: "FULL",
}

export function isFallbackField(field: AdmissionFormField): boolean {
  return field.id < 0
}

// ── Sittings shown ──────────────────────────────────────────────────

export const SITTING_NAMES = ["First sitting", "Second sitting"] as const

export function sittingName(index: number): string {
  return SITTING_NAMES[index] ?? `Sitting ${index + 1}`
}

/** One sitting for "Single", two for "Combined"; otherwise as many as entered (1–2). */
export function expectedSittingCount(
  ctx: OlevelContext,
  storedCount: number
): number {
  if (ctx.resultType === "combined_result") return 2
  if (ctx.resultType === "single_result") return 1
  return Math.min(Math.max(1, storedCount), OLEVEL_MAX_SITTINGS)
}

const blankRow = (subject = ""): OlevelSubjectRow => ({ subject, grade: "" })

function blankSitting(prefillSubjects: string[]): OlevelSitting {
  const rows = prefillSubjects
    .slice(0, OLEVEL_SUBJECTS_PER_SITTING.max)
    .map((code) => blankRow(code))
  while (rows.length < OLEVEL_SUBJECTS_PER_SITTING.min) rows.push(blankRow())
  return { exam_type: "", exam_year: "", exam_number: "", subjects: rows }
}

/**
 * The sittings to show and validate: the stored ones, trimmed or padded to
 * the expected count, each with at least the minimum number of rows. A new
 * first sitting starts with the required subjects filled in.
 */
export function effectiveSittings(
  value: DynamicFieldValue,
  ctx: OlevelContext,
  prefillSubjects: string[] = []
): OlevelSitting[] {
  const stored = parseOlevelSittings(value)
  const count = expectedSittingCount(ctx, stored.length)
  return Array.from({ length: count }, (_, i) => {
    const sitting = stored[i] ?? blankSitting(i === 0 ? prefillSubjects : [])
    const subjects = [...sitting.subjects]
    while (subjects.length < OLEVEL_SUBJECTS_PER_SITTING.min)
      subjects.push(blankRow())
    return { ...sitting, subjects }
  })
}

const isFilledRow = (row: OlevelSubjectRow) => !!row.subject || !!row.grade
const isCompleteRow = (row: OlevelSubjectRow) => !!row.subject && !!row.grade

/** Nothing entered yet (pre-filled subject names without grades don't count). */
export function isBlankSitting(sitting: OlevelSitting): boolean {
  return (
    !sitting.exam_type &&
    !sitting.exam_year &&
    !sitting.exam_number &&
    sitting.subjects.every((row) => !row.grade)
  )
}

// ── Credits ─────────────────────────────────────────────────────────

export const isCreditGrade = (grade: string): boolean =>
  (OLEVEL_CREDIT_GRADES as readonly string[]).includes(grade)

const gradeRank = (grade: string): number => {
  const i = (OLEVEL_GRADES as readonly string[]).indexOf(grade)
  return i === -1 ? Number.POSITIVE_INFINITY : i
}

export interface OlevelSummary {
  /** Distinct subjects with C6 or better, best grade across sittings. */
  credits: number
  creditSubjects: string[]
  /** Required subjects without a credit in any sitting. */
  missingRequired: string[]
  /** At least `minCredits` credits including every required subject. */
  meetsRule: boolean
}

export function summarizeOlevel(
  sittings: OlevelSitting[],
  rules: OlevelRules
): OlevelSummary {
  const best = new Map<string, string>()
  for (const sitting of sittings) {
    for (const row of sitting.subjects) {
      if (!isCompleteRow(row)) continue
      const current = best.get(row.subject)
      if (!current || gradeRank(row.grade) < gradeRank(current))
        best.set(row.subject, row.grade)
    }
  }
  const creditSubjects = [...best.entries()]
    .filter(([, grade]) => isCreditGrade(grade))
    .map(([subject]) => subject)
  const missingRequired = rules.requiredSubjects.filter(
    (code) => !creditSubjects.includes(code)
  )
  return {
    credits: creditSubjects.length,
    creditSubjects,
    missingRequired,
    meetsRule:
      creditSubjects.length >= rules.minCredits && missingRequired.length === 0,
  }
}

/** "English Language & Mathematics", "A, B & C". */
export function joinSubjectLabels(codes: string[]): string {
  const labels = codes.map(olevelSubjectLabel)
  if (labels.length <= 1) return labels[0] ?? ""
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`
}

/** The plain-language rule, e.g. "At least 5 credits (C6 or better) in at most 2 sittings, including …". */
export function describeOlevelRule(rules: OlevelRules): string {
  const sittings =
    rules.maxSittings === 1
      ? "one sitting"
      : `at most ${rules.maxSittings} sittings`
  const required = rules.requiredSubjects.length
    ? `, including ${joinSubjectLabels(rules.requiredSubjects)}`
    : ""
  return `At least ${rules.minCredits} credit${rules.minCredits === 1 ? "" : "s"} (C6 or better) in ${sittings}${required}.`
}

// ── Validation ──────────────────────────────────────────────────────

export type OlevelIssuePart =
  | "exam_type"
  | "exam_year"
  | "exam_number"
  | "subject"
  | "grade"
  | "subjects"

export interface OlevelIssue {
  /** null = about the results as a whole (credits, sittings). */
  sitting: number | null
  row: number | null
  part: OlevelIssuePart | null
  message: string
  /** Plainly wrong already (a duplicate) — shown before the applicant tries to continue. */
  immediate: boolean
}

const EXAM_NUMBER_PATTERN = /^[A-Za-z0-9/-]{4,20}$/
const EARLIEST_YEAR = 1960

export interface ValidateOlevelOptions {
  required: boolean
}

/**
 * Every problem with the entered results, in reading order. While results
 * are awaited the grid is optional: blank sittings are skipped and the
 * credit rule isn't applied, but anything entered must still be well-formed.
 */
export function validateOlevelResults(
  sittings: OlevelSitting[],
  rules: OlevelRules,
  ctx: OlevelContext,
  { required }: ValidateOlevelOptions
): OlevelIssue[] {
  const issues: OlevelIssue[] = []
  const add = (
    sitting: number | null,
    row: number | null,
    part: OlevelIssuePart | null,
    message: string,
    immediate = false
  ) => issues.push({ sitting, row, part, message, immediate })

  if (sittings.every(isBlankSitting)) {
    if (required && !ctx.awaitingResult)
      add(null, null, null, "Enter your O'level subjects and grades")
    return issues
  }

  if (sittings.length > rules.maxSittings) {
    add(
      null,
      null,
      null,
      rules.maxSittings === 1
        ? "Results from a single sitting only — choose a single result"
        : `Results from at most ${rules.maxSittings} sittings`
    )
  }

  const currentYear = new Date().getFullYear()
  const examNumbers = new Map<string, number>()

  sittings.forEach((sitting, s) => {
    if (ctx.awaitingResult && isBlankSitting(sitting)) return

    if (!(OLEVEL_EXAM_TYPES as readonly string[]).includes(sitting.exam_type))
      add(s, null, "exam_type", "Choose the exam type")

    const year = Number(sitting.exam_year)
    if (
      !/^\d{4}$/.test(sitting.exam_year) ||
      year < EARLIEST_YEAR ||
      year > currentYear
    )
      add(s, null, "exam_year", "Choose the exam year")

    if (!sitting.exam_number) {
      add(s, null, "exam_number", "Enter the exam number")
    } else if (!EXAM_NUMBER_PATTERN.test(sitting.exam_number)) {
      add(
        s,
        null,
        "exam_number",
        "Exam numbers are 4–20 letters, digits, / or -"
      )
    } else {
      const key = sitting.exam_number.toUpperCase()
      const other = examNumbers.get(key)
      if (other !== undefined)
        add(
          s,
          null,
          "exam_number",
          `Same exam number as the ${sittingName(other).toLowerCase()}`,
          true
        )
      else examNumbers.set(key, s)
    }

    const seen = new Map<string, number>()
    sitting.subjects.forEach((row, r) => {
      if (!isFilledRow(row)) return
      if (!row.subject) add(s, r, "subject", "Choose a subject")
      if (!row.grade) {
        add(
          s,
          r,
          "grade",
          row.subject
            ? `Choose a grade for ${olevelSubjectLabel(row.subject)}`
            : "Choose a grade"
        )
      } else if (!(OLEVEL_GRADES as readonly string[]).includes(row.grade)) {
        add(s, r, "grade", "Choose a grade from A1 to F9")
      }
      if (row.subject) {
        if (seen.has(row.subject))
          add(
            s,
            r,
            "subject",
            `${olevelSubjectLabel(row.subject)} is already listed in this sitting`,
            true
          )
        else seen.set(row.subject, r)
      }
    })

    const complete = sitting.subjects.filter(isCompleteRow).length
    if (complete < OLEVEL_SUBJECTS_PER_SITTING.min)
      add(
        s,
        null,
        "subjects",
        `Enter at least ${OLEVEL_SUBJECTS_PER_SITTING.min} subjects with grades (${complete} so far)`
      )
    if (complete > OLEVEL_SUBJECTS_PER_SITTING.max)
      add(
        s,
        null,
        "subjects",
        `Enter at most ${OLEVEL_SUBJECTS_PER_SITTING.max} subjects`
      )
  })

  if (!ctx.awaitingResult) {
    const summary = summarizeOlevel(sittings, rules)
    if (summary.missingRequired.length > 0) {
      add(
        null,
        null,
        null,
        `You need a credit (C6 or better) in ${joinSubjectLabels(summary.missingRequired)}`
      )
    }
    if (summary.credits < rules.minCredits) {
      add(
        null,
        null,
        null,
        `You need at least ${rules.minCredits} credits (C6 or better) — you have ${summary.credits}`
      )
    }
  }

  return issues
}

export function formatOlevelIssue(issue: OlevelIssue): string {
  if (issue.sitting === null) return issue.message
  const where =
    issue.row === null
      ? sittingName(issue.sitting)
      : `${sittingName(issue.sitting)}, row ${issue.row + 1}`
  return `${where}: ${issue.message}`
}

/** The single message stored on the form for this field, or null when valid. */
export function validateOlevelField(
  field: AdmissionFormField,
  value: DynamicFieldValue,
  ctx: OlevelContext
): string | null {
  const rules = readOlevelRules(field)
  const issues = validateOlevelResults(
    effectiveSittings(value, ctx),
    rules,
    ctx,
    { required: field.isRequired }
  )
  if (issues.length === 0) return null
  const extra = issues.length > 1 ? ` (+${issues.length - 1} more)` : ""
  return `${formatOlevelIssue(issues[0])}${extra}`
}

// ── Payload & mirrors ───────────────────────────────────────────────

/** The submitted `olevel_results` — checked before dispatch. */
export const olevelPayloadSchema = z
  .array(
    z.object({
      sitting: z.number().int().min(1).max(OLEVEL_MAX_SITTINGS),
      exam_type: z.enum(OLEVEL_EXAM_TYPES),
      exam_year: z.string().regex(/^\d{4}$/),
      exam_number: z.string().regex(EXAM_NUMBER_PATTERN),
      subjects: z
        .array(
          z.object({
            subject: z.string().min(1),
            grade: z.enum(OLEVEL_GRADES),
          })
        )
        .max(OLEVEL_SUBJECTS_PER_SITTING.max),
    })
  )
  .max(OLEVEL_MAX_SITTINGS)

export type OlevelSittingPayload = {
  sitting: number
  exam_type: string
  exam_year: string
  exam_number: string
  subjects: { subject: string; grade: string }[]
}

/**
 * What's submitted as `olevel_results` (API_CONTRACTS.md §2): the sittings
 * in force (per Result Type), without blank sittings or incomplete rows.
 */
export function toOlevelPayload(
  value: DynamicFieldValue,
  ctx: OlevelContext
): OlevelSittingPayload[] {
  return effectiveSittings(value, ctx)
    .filter((s) => !isBlankSitting(s))
    .map((s, i) => ({
      sitting: i + 1,
      exam_type: s.exam_type,
      exam_year: s.exam_year,
      exam_number: s.exam_number,
      subjects: s.subjects.filter(isCompleteRow),
    }))
}

type FlatSittingKey =
  | "first_sitting_type"
  | "first_sitting_year"
  | "first_sitting_exam_number"
  | "second_sitting_type"
  | "second_sitting_year"
  | "second_sitting_exam_number"

/**
 * The legacy flat sitting values, taken from the grid's sitting headers —
 * the live submit endpoint still reads (and requires) these keys.
 */
export function flatSittingValues(
  sittings: OlevelSitting[]
): Record<FlatSittingKey, string> {
  const [first, second] = sittings
  return {
    first_sitting_type: first?.exam_type ?? "",
    first_sitting_year: first?.exam_year ?? "",
    first_sitting_exam_number: first?.exam_number ?? "",
    second_sitting_type: second?.exam_type ?? "",
    second_sitting_year: second?.exam_year ?? "",
    second_sitting_exam_number: second?.exam_number ?? "",
  }
}

/**
 * A draft saved before the grid existed has only the flat sitting values —
 * start the grid's headers from them so nothing is asked twice.
 */
export function seedSittingsFromFlat(
  values: Pick<FormDefaultValues, FlatSittingKey>
): OlevelSitting[] {
  const sittings: OlevelSitting[] = []
  const first = {
    exam_type: values.first_sitting_type ?? "",
    exam_year: values.first_sitting_year ?? "",
    exam_number: values.first_sitting_exam_number ?? "",
  }
  const second = {
    exam_type: values.second_sitting_type ?? "",
    exam_year: values.second_sitting_year ?? "",
    exam_number: values.second_sitting_exam_number ?? "",
  }
  const hasAny = (h: typeof first) =>
    !!(h.exam_type || h.exam_year || h.exam_number)
  if (hasAny(first) || hasAny(second)) sittings.push({ ...first, subjects: [] })
  if (hasAny(second)) sittings.push({ ...second, subjects: [] })
  return sittings
}
