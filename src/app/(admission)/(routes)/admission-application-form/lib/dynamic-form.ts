import type { ElementType } from "react"
import type { UseFormReturn } from "react-hook-form"
import { CheckCircle } from "lucide-react"
import { getStepIcon } from "@/lib/admissionStepIcons"
import type {
  AdmissionFormField,
  AdmissionStepDefinition,
  EffectiveAdmissionStep,
  FieldCondition,
} from "@/types/admissionConfig"
import {
  FORM_STEPS,
  FORM_STEP_KEYS,
  FormStep,
  type FormDefaultValues,
} from "../types/form-types"
import { isEmptyValue, validateFieldValue } from "./dynamic-field-schema"

/* ------------------------------------------------------------------ */
/*  Dynamic application form — sandbox/dynamic-admission/              */
/*                                                                     */
/*  Turns the resolved FORM steps into the wizard's step list. A step   */
/*  with seeded system fields renders from its field definitions; a     */
/*  built-in step without them keeps its hand-built component (plus any */
/*  admin-added questions); a custom step with fields renders          */
/*  generically. System fields read/write the typed form values the     */
/*  current submit payload uses, so the backend keeps working before    */
/*  and after it ships `answers`.                                       */
/* ------------------------------------------------------------------ */

export type DynamicRow = { [key: string]: DynamicFieldValue }

export type DynamicFieldValue =
  | string
  | number
  | boolean
  | string[]
  | File
  | File[]
  | DynamicRow[]
  | null
  | undefined

export type DynamicAnswers = Record<string, Record<string, DynamicFieldValue>>

interface WizardStepBase {
  /** The step's registry key, e.g. "PERSONAL_INFO" — stable across sessions. */
  id: string
  title: string
  description: string
  icon: ElementType
}

export interface BuiltinWizardStep extends WizardStepBase {
  kind: "builtin"
  formStep: FormStep
  /** Admin-added questions shown below the hand-built component. */
  extraFields: AdmissionFormField[]
}

export interface DynamicWizardStep extends WizardStepBase {
  kind: "dynamic"
  fields: AdmissionFormField[]
}

export interface ReviewWizardStep extends WizardStepBase {
  kind: "review"
}

export type WizardStep =
  | BuiltinWizardStep
  | DynamicWizardStep
  | ReviewWizardStep

export const REVIEW_STEP_ID = FORM_STEP_KEYS[FormStep.REVIEW]
const ADDITIONAL_INFO_KEY = FORM_STEP_KEYS[FormStep.ADDITIONAL_INFO]
const PROGRAM_SELECTION_KEY = FORM_STEP_KEYS[FormStep.PROGRAM_SELECTION]

const KEY_TO_FORM_STEP = new Map<string, FormStep>(
  FORM_STEPS.filter(
    (s) => s.id !== FormStep.REVIEW && s.id !== FormStep.ADDITIONAL_INFO
  ).map((s) => [FORM_STEP_KEYS[s.id], s.id])
)

/** Legacy saved-step values were FormStep numbers; newer ones are step keys. */
export function migrateSavedStepId(saved: string): string {
  if (!/^\d+$/.test(saved)) return saved
  const step = Number(saved) as FormStep
  return FORM_STEP_KEYS[step] ?? saved
}

export function stepFields(step: WizardStep): AdmissionFormField[] {
  return step.kind === "dynamic"
    ? step.fields
    : step.kind === "builtin"
      ? step.extraFields
      : []
}

/** The API may nest child fields or return them flat — normalise to one flat, active list. */
export function flattenFieldTree(
  fields: AdmissionFormField[]
): AdmissionFormField[] {
  const flat = fields.flatMap((field) => [
    field,
    ...(field.children ?? []).map((child) => ({
      ...child,
      parentFieldId: child.parentFieldId ?? field.id,
    })),
  ])
  return [...new Map(flat.map((f) => [f.id, f])).values()]
    .filter((f) => f.isActive !== false)
    .sort((a, b) => a.order - b.order)
}

interface SourceStep {
  key: string
  label: string
  description: string
  icon: string
  order: number
  fields: AdmissionFormField[]
}

const legacyStep = (formStep: FormStep): BuiltinWizardStep => {
  const def = FORM_STEPS.find((s) => s.id === formStep)
  return {
    kind: "builtin",
    id: FORM_STEP_KEYS[formStep],
    formStep,
    title: def?.title ?? FORM_STEP_KEYS[formStep],
    description: def?.description ?? "",
    icon: def?.icon ?? CheckCircle,
    extraFields: [],
  }
}

export function buildWizardSteps({
  configSteps,
  effectiveSteps,
  programAlreadyChosen,
}: {
  /** Raw registry rows (all scopes). Used only when the effective list isn't available. */
  configSteps: AdmissionStepDefinition[]
  /** Server-resolved steps for the applicant's program. */
  effectiveSteps: EffectiveAdmissionStep[] | undefined
  /** PROGRAM_SELECTION is skipped once the "Choice Program" stage recorded a choice. */
  programAlreadyChosen: boolean
}): WizardStep[] {
  const source: SourceStep[] =
    effectiveSteps && effectiveSteps.length > 0
      ? effectiveSteps.map((s) => ({ ...s, fields: s.fields ?? [] }))
      : configSteps
          .filter(
            (s) =>
              !s.programId && !s.programCategory && (s.enabled || s.required)
          )
          .map((s) => ({ ...s, fields: s.fields ?? [] }))

  const reviewRow = source.find((s) => s.key === REVIEW_STEP_ID)
  const reviewDef = FORM_STEPS.find((s) => s.id === FormStep.REVIEW)
  const review: ReviewWizardStep = {
    kind: "review",
    id: REVIEW_STEP_ID,
    title: reviewRow?.label ?? reviewDef?.title ?? "Review & Submit",
    description:
      reviewRow?.description ??
      reviewDef?.description ??
      "Review before submitting",
    icon: reviewRow
      ? getStepIcon(reviewRow.icon)
      : (reviewDef?.icon ?? CheckCircle),
  }

  // No registry at all (not loaded / unreachable) — today's fixed flow.
  if (source.length === 0) {
    return [
      ...FORM_STEPS.filter(
        (s) =>
          s.id !== FormStep.REVIEW &&
          s.id !== FormStep.ADDITIONAL_INFO &&
          !s.isOptional &&
          !(s.id === FormStep.PROGRAM_SELECTION && programAlreadyChosen)
      ).map((s) => legacyStep(s.id)),
      review,
    ]
  }

  const steps: WizardStep[] = []
  for (const s of [...source].sort((a, b) => a.order - b.order)) {
    if (s.key === REVIEW_STEP_ID || s.key === ADDITIONAL_INFO_KEY) continue
    if (s.key === PROGRAM_SELECTION_KEY && programAlreadyChosen) continue
    const fields = flattenFieldTree(s.fields)
    const formStep = KEY_TO_FORM_STEP.get(s.key)
    const base = {
      id: s.key,
      title: s.label,
      description: s.description,
      icon: getStepIcon(s.icon),
    }
    if (formStep !== undefined && !fields.some((f) => f.systemKey)) {
      steps.push({ ...base, kind: "builtin", formStep, extraFields: fields })
    } else if (fields.length > 0) {
      steps.push({ ...base, kind: "dynamic", fields })
    }
    // A custom step with no questions has nothing to show, so it's skipped.
  }

  // Without a recorded program choice, the program must be collected here —
  // even if the admin switched the step off (see the Choice Program stage).
  if (
    !programAlreadyChosen &&
    !steps.some((s) => s.id === PROGRAM_SELECTION_KEY)
  ) {
    steps.push(legacyStep(FormStep.PROGRAM_SELECTION))
  }

  return [...steps, review]
}

// ── Values ──────────────────────────────────────────────────────────

type FormValueKey = Exclude<keyof FormDefaultValues, "answers">

/** systemKey → the typed form value the current submit payload reads. */
export const SYSTEM_FORM_VALUE_KEYS: Record<string, FormValueKey> = {
  programId: "programId",
  entryMode: "entryMode",
  startTerm: "startTerm",
  studyMode: "studyMode",
  nationality: "nationality",
  stateOfOrigin: "state_of_origin",
  lga: "lga",
  religion: "religion",
  dob: "dob",
  gender: "gender",
  hometown: "hometown",
  hometownAddress: "hometown_address",
  contactAddress: "contact_address",
  hasDisability: "has_disability",
  disability: "disability",
  hasSponsor: "has_sponsor",
  sponsorName: "sponsor_name",
  sponsorRelationship: "sponsor_relationship",
  sponsorEmail: "sponsor_email",
  sponsorContactAddress: "sponsor_contact_address",
  sponsorPhoneNumber: "sponsor_phone_number",
  nextOfKinName: "next_of_kin_name",
  nextOfKinRelationship: "next_of_kin_relationship",
  nextOfKinPhoneNumber: "next_of_kin_phone_number",
  nextOfKinAddress: "next_of_kin_address",
  nextOfKinEmail: "next_of_kin_email",
  isNextOfKinPrimaryContact: "is_next_of_kin_primary_contact",
  nextOfKinAlternatePhoneNumber: "next_of_kin_alternate_phone_number",
  nextOfKinOccupation: "next_of_kin_occupation",
  nextOfKinWorkplace: "next_of_kin_workplace",
  passport: "passport",
  firstSchoolLeaving: "first_school_leaving",
  oLevel: "o_level",
  otherDocuments: "other_documents",
  awaitingResult: "awaiting_result",
  combinedResult: "combined_result",
  firstSittingType: "first_sitting_type",
  firstSittingYear: "first_sitting_year",
  firstSittingExamNumber: "first_sitting_exam_number",
  secondSittingType: "second_sitting_type",
  secondSittingYear: "second_sitting_year",
  secondSittingExamNumber: "second_sitting_exam_number",
  firstSittingResult: "first_sitting_result",
  secondSittingResult: "second_sitting_result",
}

const FORM_VALUE_KEYS = new Set<string>(Object.values(SYSTEM_FORM_VALUE_KEYS))

export function formValueKeyFor(
  field: AdmissionFormField
): FormValueKey | null {
  return field.systemKey
    ? (SYSTEM_FORM_VALUE_KEYS[field.systemKey] ?? null)
    : null
}

/** Where a field's value (and its error) lives in the form. */
export function fieldPath(stepId: string, field: AdmissionFormField): string {
  return formValueKeyFor(field) ?? `answers.${stepId}.${field.key}`
}

export function readFieldValue(
  values: FormDefaultValues,
  stepId: string,
  field: AdmissionFormField
): DynamicFieldValue {
  const key = formValueKeyFor(field)
  if (key === "programId")
    return values.programId ? String(values.programId) : ""
  if (key) return values[key]
  return values.answers?.[stepId]?.[field.key]
}

export function writeFieldValue(
  form: UseFormReturn<FormDefaultValues>,
  stepId: string,
  field: AdmissionFormField,
  value: DynamicFieldValue
): void {
  const options = { shouldDirty: true, shouldTouch: true }
  const key = formValueKeyFor(field)
  if (key) {
    const next = key === "programId" ? Number(value) || 0 : value
    // The value's type depends on which system field `key` is; each field's
    // renderer only ever produces that field's own value type.
    form.setValue(key, next as never, options)
    return
  }
  const answers = form.getValues("answers") ?? {}
  form.setValue(
    "answers",
    {
      ...answers,
      [stepId]: { ...(answers[stepId] ?? {}), [field.key]: value },
    },
    options
  )
}

// ── Conditions ──────────────────────────────────────────────────────

export interface FieldIndexEntry {
  stepId: string
  field: AdmissionFormField
}

/** Every field definition across the wizard, by key (first occurrence wins). */
export function buildFieldIndex(
  steps: WizardStep[]
): Map<string, FieldIndexEntry> {
  const index = new Map<string, FieldIndexEntry>()
  for (const step of steps) {
    for (const field of stepFields(step)) {
      if (!index.has(field.key))
        index.set(field.key, { stepId: step.id, field })
    }
  }
  return index
}

export type ValueLookup = (key: string) => DynamicFieldValue

/** Looks a field key up across the whole form, including hand-built steps' values. */
export function makeLookup(
  values: FormDefaultValues,
  index: Map<string, FieldIndexEntry>
): ValueLookup {
  return (key) => {
    const entry = index.get(key)
    if (entry) return readFieldValue(values, entry.stepId, entry.field)
    if (FORM_VALUE_KEYS.has(key)) return values[key as FormValueKey]
    return undefined
  }
}

const asText = (value: DynamicFieldValue): string =>
  typeof value === "boolean"
    ? String(value)
    : value == null
      ? ""
      : String(value)

export function evaluateCondition(
  condition: FieldCondition,
  lookup: ValueLookup
): boolean {
  if ("all" in condition)
    return condition.all.every((c) => evaluateCondition(c, lookup))
  if ("any" in condition)
    return condition.any.some((c) => evaluateCondition(c, lookup))
  const value = lookup(condition.field)
  switch (condition.op) {
    case "isTrue":
      return value === true
    case "isFalse":
      return value !== true
    case "isEmpty":
      return isEmptyValue(value)
    case "isNotEmpty":
      return !isEmptyValue(value)
    case "equals":
    case "notEquals": {
      const matches = Array.isArray(value)
        ? value.some(
            (v) => asText(v as DynamicFieldValue) === String(condition.value)
          )
        : asText(value) === String(condition.value)
      return condition.op === "equals" ? matches : !matches
    }
    case "in":
    case "notIn": {
      const wanted = condition.value.map(String)
      const matches = Array.isArray(value)
        ? value.some((v) => wanted.includes(asText(v as DynamicFieldValue)))
        : wanted.includes(asText(value))
      return condition.op === "in" ? matches : !matches
    }
  }
}

export function isFieldVisible(
  field: AdmissionFormField,
  lookup: ValueLookup
): boolean {
  return !field.visibleWhen || evaluateCondition(field.visibleWhen, lookup)
}

// ── Validation & payload ────────────────────────────────────────────

export interface StepIssue {
  /** Form path the error is stored under. */
  path: string
  label: string
  message: string
}

export function validateStepFields(
  stepId: string,
  fields: AdmissionFormField[],
  values: FormDefaultValues,
  lookup: ValueLookup
): StepIssue[] {
  const issues: StepIssue[] = []
  for (const field of fields.filter((f) => !f.parentFieldId)) {
    if (!isFieldVisible(field, lookup)) continue
    const children = fields.filter((c) => c.parentFieldId === field.id)
    const message = validateFieldValue(
      field,
      readFieldValue(values, stepId, field),
      children
    )
    if (message) {
      issues.push({
        path: fieldPath(stepId, field),
        label: field.label,
        message,
      })
    }
  }
  return issues
}

/**
 * `answers[stepKey][fieldKey]` for every visible dynamic question (the new
 * contract), plus `customFields[fieldKey]` for the non-system ones (what the
 * live submit endpoint reads today).
 */
export function buildDynamicPayload(
  steps: WizardStep[],
  values: FormDefaultValues,
  lookup: ValueLookup
): {
  answers: DynamicAnswers
  customFields: Record<string, DynamicFieldValue>
} {
  const answers: DynamicAnswers = {}
  const customFields: Record<string, DynamicFieldValue> = {}
  for (const step of steps) {
    const fields = stepFields(step)
    for (const field of fields.filter((f) => !f.parentFieldId)) {
      if (!isFieldVisible(field, lookup)) continue
      const value = readFieldValue(values, step.id, field)
      if (isEmptyValue(value)) continue
      // System files already travel under their flat multipart keys — don't upload them twice.
      const isFileValue =
        value instanceof File ||
        (Array.isArray(value) && value.some((v) => v instanceof File))
      if (field.systemKey && isFileValue) continue
      answers[step.id] = { ...(answers[step.id] ?? {}), [field.key]: value }
      if (!field.systemKey) customFields[field.key] = value
    }
  }
  return { answers, customFields }
}

/** A readable answer for review screens. `optionLabel` maps a stored value to its label. */
export function displayFieldValue(
  field: AdmissionFormField,
  value: DynamicFieldValue,
  optionLabel?: (value: string) => string | undefined
): string | undefined {
  if (isEmptyValue(value)) return undefined
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (value instanceof File) return value.name
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item instanceof File) return item.name
        if (typeof item === "string") return optionLabel?.(item) ?? item
        return Object.values(item)
          .map((v) => (v instanceof File ? v.name : asText(v)))
          .filter(Boolean)
          .join(" · ")
      })
      .join(", ")
  }
  const text = String(value)
  const staticLabel = field.options?.find((o) => o.value === text)?.label
  return staticLabel ?? optionLabel?.(text) ?? text
}
