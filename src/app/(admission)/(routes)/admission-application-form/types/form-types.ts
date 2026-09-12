import type { z } from "zod"
import type { FieldError, FieldErrors } from "react-hook-form"
import {
  User,
  Heart,
  Users,
  FileText,
  GraduationCap,
  BookOpen,
  FolderOpen,
  Settings,
  CheckCircle,
  ListPlus,
} from "lucide-react"
import type { ElementType } from "react"
import type {
  personalInfoSchema,
  sponsorInfoSchema,
  nextOfKinSchema,
  documentsSchema,
  qualificationFieldsSchema,
  examSittingSchema,
  qualificationDocumentsSchema,
  programSelectionSchema,
} from "../schema/admission-schema"
import type { AdmissionFormField } from "@/types/admissionConfig"

// ─── Step Enum ───────────────────────────────────────────────────────────────
export enum FormStep {
  PERSONAL_INFO = 0,
  SPONSOR_INFO = 1,
  NEXT_OF_KIN = 2,
  DOCUMENTS = 3,
  QUALIFICATION_FIELDS = 4,
  EXAM_SITTING = 5,
  QUALIFICATION_DOCUMENTS = 6,
  PROGRAM_SELECTION = 7,
  REVIEW = 8,
  // Multi-Program Platform — sandbox/multi-program-platform/. Appended
  // after REVIEW (not inserted earlier) so REVIEW's numeric value stays 8 —
  // an in-progress applicant's already-persisted `stepStorageKey` value of
  // "8" must keep meaning Review, not silently become this step instead.
  // Visual/navigation position (right before Review) comes from where this
  // is placed in FORM_STEPS below, not from this numeric value — see
  // getActiveFormSteps.
  ADDITIONAL_INFO = 9,
}

// ─── Step Configuration ──────────────────────────────────────────────────────
export interface StepConfig {
  id: FormStep
  title: string
  description: string
  icon: ElementType
  isOptional?: boolean
}

export const FORM_STEPS: StepConfig[] = [
  {
    id: FormStep.PERSONAL_INFO,
    title: "Personal Information",
    description: "Basic details about yourself",
    icon: User,
  },
  {
    id: FormStep.SPONSOR_INFO,
    title: "Sponsor Information",
    description: "Details about your sponsor (if applicable)",
    icon: Heart,
    isOptional: true,
  },
  {
    id: FormStep.NEXT_OF_KIN,
    title: "Next of Kin",
    description: "Emergency contact details",
    icon: Users,
  },
  {
    id: FormStep.DOCUMENTS,
    title: "Documents",
    description: "Upload required documents",
    icon: FileText,
  },
  {
    id: FormStep.QUALIFICATION_FIELDS,
    title: "Qualification Information",
    description: "Your academic qualification details",
    icon: GraduationCap,
  },
  {
    id: FormStep.EXAM_SITTING,
    title: "Exam Sitting",
    description: "O-Level examination details",
    icon: BookOpen,
    isOptional: true,
  },
  {
    id: FormStep.QUALIFICATION_DOCUMENTS,
    title: "Qualification Documents",
    description: "Upload your academic qualification documents",
    icon: FolderOpen,
    isOptional: true,
  },
  {
    id: FormStep.PROGRAM_SELECTION,
    title: "Program Selection",
    description: "Choose your desired program",
    icon: Settings,
  },
  {
    id: FormStep.ADDITIONAL_INFO,
    title: "Additional Information",
    description: "Program-specific questions for the program you selected",
    icon: ListPlus,
  },
  {
    id: FormStep.REVIEW,
    title: "Review & Submit",
    description: "Review your application before submitting",
    icon: CheckCircle,
  },
]

export const TOTAL_STEPS = FORM_STEPS.length

// ─── Admin-configurable step keys ────────────────────────────────────────────
// Matches the `key` strings in src/lib/admissionConfig.ts's formSteps defaults.
export const FORM_STEP_KEYS: Record<FormStep, string> = {
  [FormStep.PERSONAL_INFO]: "PERSONAL_INFO",
  [FormStep.SPONSOR_INFO]: "SPONSOR_INFO",
  [FormStep.NEXT_OF_KIN]: "NEXT_OF_KIN",
  [FormStep.DOCUMENTS]: "DOCUMENTS",
  [FormStep.QUALIFICATION_FIELDS]: "QUALIFICATION_FIELDS",
  [FormStep.EXAM_SITTING]: "EXAM_SITTING",
  [FormStep.QUALIFICATION_DOCUMENTS]: "QUALIFICATION_DOCUMENTS",
  [FormStep.PROGRAM_SELECTION]: "PROGRAM_SELECTION",
  [FormStep.REVIEW]: "REVIEW",
  [FormStep.ADDITIONAL_INFO]: "ADDITIONAL_INFO",
}

/** The 9 built-in step keys — anything else in a resolved FORM-group step
 *  list is a Multi-Program Platform custom step, whose `fields` are shown
 *  in the ADDITIONAL_INFO step instead of a dedicated hardcoded component.
 *  See sandbox/multi-program-platform/ §B. */
export const KNOWN_FORM_STEP_KEY_SET = new Set(Object.values(FORM_STEP_KEYS))

/** Every custom (non-built-in) FORM-group field resolved for the
 *  applicant's program, flattened across however many custom steps the
 *  registry defines — they all render together on ADDITIONAL_INFO rather
 *  than each getting their own wizard page (see README.md §2/§B for why:
 *  a wizard page needs a stable numeric FormStep identity throughout this
 *  module, which a variable-length admin-defined step list can't supply
 *  without a much larger rework). */
export function getCustomFormFields(
  effectiveFormSteps: { key: string; fields?: AdmissionFormField[] }[]
): AdmissionFormField[] {
  return effectiveFormSteps
    .filter((s) => !KNOWN_FORM_STEP_KEY_SET.has(s.key))
    .flatMap((s) => s.fields ?? [])
    .sort((a, b) => a.order - b.order)
}

/**
 * Ordered list of form steps that are actually enabled, given the admin's
 * step registry rows (src/services/admissionStepsApi.ts). Steps are sorted
 * by the registry's `order` field, so admin-driven reordering is reflected
 * here. REVIEW is always last and always included regardless of its stored
 * order — it's the terminal step. Custom/unknown keys (steps the admin
 * created that don't match one of the 9 built-in FormStep values) have no
 * matching UI component yet and are silently excluded — see
 * sandbox/admission/admission_features_workflow.md.
 *
 * PROGRAM_SELECTION is excluded only once the applicant has a confirmed
 * pre-application program choice on record (`programAlreadyChosen` — from
 * `AdmissionStudent.has_selected_program`, set at the earlier "Choice
 * Program" PROCESS step, before the application fee). Until that choice
 * actually exists — which today is always, since the backend endpoint it
 * needs doesn't exist yet, see sandbox/REFACTOR_BACKEND_APIS.md — this step
 * stays in the form, because otherwise programId/entryMode would never be
 * collectible anywhere and every submission would fail validation with no
 * way for the applicant to fix it. It ignores the admin's enabled/required
 * toggle for this key entirely (that toggle is now hidden from the admin
 * config panel too — see admission-config/page.tsx).
 */
export function getActiveFormSteps(
  stepDefinitions: {
    key: string
    enabled: boolean
    required: boolean
    order: number
  }[],
  programAlreadyChosen: boolean,
  // Multi-Program Platform — sandbox/multi-program-platform/ §B. Only
  // included when the applicant's program actually has custom FORM-group
  // fields resolved for it — an institution/program with none never shows
  // this step, so nothing changes for the existing 9-step flow by default.
  hasCustomFields = false
): FormStep[] {
  const byKey = new Map(stepDefinitions.map((s) => [s.key, s]))

  const ordered = FORM_STEPS.filter(
    (step) => step.id !== FormStep.REVIEW && step.id !== FormStep.ADDITIONAL_INFO
  )
    .map((step) => ({
      step: step.id,
      isOptional: step.isOptional,
      def: byKey.get(FORM_STEP_KEYS[step.id]),
    }))
    .filter(({ step, def, isOptional }) => {
      if (step === FormStep.PROGRAM_SELECTION) return !programAlreadyChosen
      // If the registry row is missing entirely (e.g. deleted), fall back to
      // whether this step is optional by design — a deleted optional step
      // stays excluded, a deleted non-optional one defensively stays included
      // rather than silently breaking the form.
      return def ? def.enabled || def.required : !isOptional
    })
    .sort((a, b) => (a.def?.order ?? 0) - (b.def?.order ?? 0))
    .map(({ step }) => step)

  return [
    ...ordered,
    ...(hasCustomFields ? [FormStep.ADDITIONAL_INFO] : []),
    FormStep.REVIEW,
  ]
}

// ─── Storage Key ─────────────────────────────────────────────────────────────
export const FORM_STORAGE_KEY = "odl_admission_form"
export const STEP_STORAGE_KEY = "odl_admission_step"

// ─── Default Form Values ─────────────────────────────────────────────────────
export const DEFAULT_FORM_VALUES: FormDefaultValues = {
  // Now sourced from the Countries select (src/modules/demographics) — a
  // plain default string would just fail to match any real Country's name
  // and leave the select looking unselected, so this starts blank instead.
  nationality: "",
  state_of_origin: "",
  lga: "",
  religion: "",
  dob: "",
  gender: "" as "Male" | "Female" | "",
  hometown: "",
  hometown_address: "",
  contact_address: "",
  has_disability: false,
  disability: "None",

  has_sponsor: false,
  sponsor_name: "",
  sponsor_relationship: "",
  sponsor_email: "",
  sponsor_contact_address: "",
  sponsor_phone_number: "",

  next_of_kin_name: "",
  next_of_kin_relationship: "",
  next_of_kin_phone_number: "",
  next_of_kin_address: "",
  next_of_kin_email: "",
  is_next_of_kin_primary_contact: false,
  next_of_kin_alternate_phone_number: "",
  next_of_kin_occupation: "",
  next_of_kin_workplace: "",

  passport: undefined,
  first_school_leaving: undefined,
  o_level: undefined,
  other_documents: undefined,

  combined_result: "",
  awaiting_result: false,

  first_sitting_type: "",
  first_sitting_year: "",
  first_sitting_exam_number: "",
  second_sitting_type: "",
  second_sitting_year: "",
  second_sitting_exam_number: "",

  first_sitting_result: undefined,
  second_sitting_result: undefined,

  // TEMPORARY defaults — Program Selection is slated for removal once the
  // "Choice Program" pre-application step (sandbox/REFACTOR_BACKEND_APIS.md)
  // is backed by a real endpoint; until then this unblocks submission
  // without requiring a manual pick. Remove these two hardcoded values (back
  // to `0`/`""`) once that happens.
  programId: 1,
  entryMode: "UTME" as "UTME" | "DIRECT_ENTRY" | "TRANSFER" | "",
  startTerm: "2026/2027 - 100 level - 1st Semester",
  studyMode: "online",

  agreeToTerms: false,

  customFields: {},
}

// ─── Step Field Mappings ─────────────────────────────────────────────────────
export const STEP_FIELDS: Record<FormStep, string[]> = {
  [FormStep.PERSONAL_INFO]: [
    "nationality",
    "state_of_origin",
    "lga",
    "religion",
    "dob",
    "gender",
    "hometown",
    "hometown_address",
    "contact_address",
    "has_disability",
    "disability",
  ],
  [FormStep.SPONSOR_INFO]: [
    "has_sponsor",
    "sponsor_name",
    "sponsor_relationship",
    "sponsor_email",
    "sponsor_contact_address",
    "sponsor_phone_number",
  ],
  [FormStep.NEXT_OF_KIN]: [
    "next_of_kin_name",
    "next_of_kin_relationship",
    "next_of_kin_phone_number",
    "next_of_kin_address",
    "next_of_kin_email",
    "is_next_of_kin_primary_contact",
    "next_of_kin_alternate_phone_number",
    "next_of_kin_occupation",
    "next_of_kin_workplace",
  ],
  [FormStep.DOCUMENTS]: [
    "passport",
    "first_school_leaving",
    "o_level",
    "other_documents",
  ],
  [FormStep.QUALIFICATION_FIELDS]: ["combined_result", "awaiting_result"],
  [FormStep.EXAM_SITTING]: [
    "first_sitting_type",
    "first_sitting_year",
    "first_sitting_exam_number",
    "second_sitting_type",
    "second_sitting_year",
    "second_sitting_exam_number",
  ],
  [FormStep.QUALIFICATION_DOCUMENTS]: [
    "first_sitting_result",
    "second_sitting_result",
  ],
  [FormStep.PROGRAM_SELECTION]: [
    "programId",
    "entryMode",
    "startTerm",
    "studyMode",
  ],
  [FormStep.REVIEW]: ["agreeToTerms"],
  // Real per-key errors live under `customFields.<key>` (see
  // useAdmissionForm.ts's ADDITIONAL_INFO validation branch) — this single
  // entry is only a stand-in so STEP_FIELDS/FIELD_TO_STEP stay total maps.
  [FormStep.ADDITIONAL_INFO]: ["customFields"],
}

/** Reverse lookup of STEP_FIELDS — which step a given field name lives on, for the submit error summary. */
const FIELD_TO_STEP = new Map<string, FormStep>(
  Object.entries(STEP_FIELDS).flatMap(([step, fields]) =>
    fields.map((field) => [field, Number(step) as FormStep] as const)
  )
)

export function getStepForField(field: string): FormStep | undefined {
  return FIELD_TO_STEP.get(field)
}

/**
 * Backend payload keys that don't match the form's own field name — see
 * `submitApplication` in application-submit.service.ts, which renames a few
 * fields on the way out. Everything not listed here is sent under its form
 * field name unchanged.
 */
const BACKEND_FIELD_ALIASES: Record<string, string> = {
  stateOfOrigin: "state_of_origin",
}

/**
 * Resolves a backend validation-error key (from a Laravel `errors` map,
 * possibly indexed like `other_documents.0`) to the form field it maps to,
 * so a server-side rejection can be labelled and linked to its step.
 */
export function backendFieldToFormField(key: string): string {
  const base = key.split(".")[0]
  return BACKEND_FIELD_ALIASES[base] ?? base
}

/** Human-readable labels for the submit error summary — falls back to a prettified field name for anything missing here. */
export const FIELD_LABELS: Record<string, string> = {
  // Identity/session fields — sent from the logged-in profile & active
  // session, not collected on any step, but the backend can still reject them.
  firstName: "First Name",
  middleName: "Middle Name",
  lastName: "Last Name",
  email: "Email Address",
  phoneNumber: "Phone Number",
  sessionId: "Academic Session",
  nationality: "Nationality",
  state_of_origin: "State of Origin",
  lga: "Local Government Area",
  religion: "Religion",
  dob: "Date of Birth",
  gender: "Gender",
  hometown: "Hometown",
  hometown_address: "Hometown Address",
  contact_address: "Contact Address",
  has_disability: "Has Disability",
  disability: "Disability Description",
  has_sponsor: "Has Sponsor",
  sponsor_name: "Sponsor's Name",
  sponsor_relationship: "Sponsor's Relationship",
  sponsor_email: "Sponsor's Email",
  sponsor_contact_address: "Sponsor's Contact Address",
  sponsor_phone_number: "Sponsor's Phone Number",
  next_of_kin_name: "Next of Kin's Full Name",
  next_of_kin_relationship: "Next of Kin's Relationship",
  next_of_kin_phone_number: "Next of Kin's Phone Number",
  next_of_kin_address: "Next of Kin's Address",
  next_of_kin_email: "Next of Kin's Email",
  is_next_of_kin_primary_contact: "Next of Kin as Primary Contact",
  next_of_kin_alternate_phone_number: "Next of Kin's Alternate Phone",
  next_of_kin_occupation: "Next of Kin's Occupation",
  next_of_kin_workplace: "Next of Kin's Workplace",
  passport: "Passport Photograph",
  first_school_leaving: "First School Leaving Certificate",
  o_level: "O-Level Certificate",
  other_documents: "Other Documents",
  combined_result: "Result Type",
  awaiting_result: "Awaiting Result",
  first_sitting_type: "First Sitting Exam Type",
  first_sitting_year: "First Sitting Exam Year",
  first_sitting_exam_number: "First Sitting Exam Number",
  second_sitting_type: "Second Sitting Exam Type",
  second_sitting_year: "Second Sitting Exam Year",
  second_sitting_exam_number: "Second Sitting Exam Number",
  first_sitting_result: "First Sitting Result Document",
  second_sitting_result: "Second Sitting Result Document",
  programId: "Program",
  entryMode: "Entry Mode",
  startTerm: "Start Term",
  studyMode: "Study Mode",
  agreeToTerms: "Terms & Conditions Agreement",
  customFields: "Additional Information",
}

export function getFieldLabel(field: string): string {
  return (
    FIELD_LABELS[field] ??
    field
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export interface FlatFormError {
  /** Full path including array index, e.g. "other_documents.1" — for React keys only. */
  path: string
  /** Top-level field name, e.g. "other_documents" — for label/step lookups. */
  field: string
  message: string
}

function isFieldErrorLeaf(node: unknown): node is FieldError {
  return (
    !!node &&
    typeof node === "object" &&
    "message" in node &&
    typeof (node as FieldError).message === "string"
  )
}

/**
 * Flattens react-hook-form's FieldErrors into a plain list of messages.
 * A field like `other_documents` (multiple file upload) validates as an
 * array — RHF represents a single bad file as
 * `errors.other_documents = [undefined, { message: "..." }]`, not a single
 * top-level `.message`. Reading `errors.other_documents?.message` directly
 * (as both the per-field inline error and the old step-navigation toast
 * did) silently finds nothing in that case — this walks arrays/nested
 * objects so a per-item error is never lost.
 */
export function collectFormErrors(
  errors: FieldErrors,
  parentPath = ""
): FlatFormError[] {
  const results: FlatFormError[] = []

  for (const [key, value] of Object.entries(errors)) {
    if (value === undefined || value === null) continue
    const path = parentPath ? `${parentPath}.${key}` : key
    const field = parentPath ? parentPath.split(".")[0] : key

    if (isFieldErrorLeaf(value)) {
      results.push({ path, field, message: value.message! })
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (!item) return
        if (isFieldErrorLeaf(item)) {
          results.push({
            path: `${path}.${idx}`,
            field,
            message: item.message!,
          })
        } else if (typeof item === "object") {
          results.push(
            ...collectFormErrors(item as FieldErrors, `${path}.${idx}`)
          )
        }
      })
      continue
    }

    if (typeof value === "object") {
      results.push(...collectFormErrors(value as FieldErrors, path))
    }
  }

  return results
}

// ─── Per-Step Schema Types ───────────────────────────────────────────────────
export type StepSchemaMap = {
  [FormStep.PERSONAL_INFO]: typeof personalInfoSchema
  [FormStep.SPONSOR_INFO]: typeof sponsorInfoSchema
  [FormStep.NEXT_OF_KIN]: typeof nextOfKinSchema
  [FormStep.DOCUMENTS]: typeof documentsSchema
  [FormStep.QUALIFICATION_FIELDS]: typeof qualificationFieldsSchema
  [FormStep.EXAM_SITTING]: typeof examSittingSchema
  [FormStep.QUALIFICATION_DOCUMENTS]: typeof qualificationDocumentsSchema
  [FormStep.PROGRAM_SELECTION]: typeof programSelectionSchema
  [FormStep.REVIEW]: z.ZodObject<{ agreeToTerms: z.ZodBoolean }>
}

// ─── Form Default Values Type ────────────────────────────────────────────────
export interface FormDefaultValues {
  nationality: string
  state_of_origin: string
  lga: string
  religion: string
  dob: string
  gender: "Male" | "Female" | ""
  hometown: string
  hometown_address: string
  contact_address: string
  has_disability: boolean
  disability: string

  has_sponsor: boolean
  sponsor_name: string
  sponsor_relationship: string
  sponsor_email: string
  sponsor_contact_address: string
  sponsor_phone_number: string

  next_of_kin_name: string
  next_of_kin_relationship: string
  next_of_kin_phone_number: string
  next_of_kin_address: string
  next_of_kin_email: string
  is_next_of_kin_primary_contact: boolean
  next_of_kin_alternate_phone_number: string
  next_of_kin_occupation: string
  next_of_kin_workplace: string

  passport: File | undefined
  first_school_leaving: File | undefined
  o_level: File | undefined
  other_documents: File[] | undefined

  combined_result: "" | "single_result" | "combined_result"
  awaiting_result: boolean

  first_sitting_type: string
  first_sitting_year: string
  first_sitting_exam_number: string
  second_sitting_type: string
  second_sitting_year: string
  second_sitting_exam_number: string

  first_sitting_result: File | undefined
  second_sitting_result: File | undefined

  programId: number
  entryMode: "UTME" | "DIRECT_ENTRY" | "TRANSFER" | ""
  startTerm: string
  studyMode: "online" | "offline"

  agreeToTerms: boolean

  // Multi-Program Platform — sandbox/multi-program-platform/ §B. Answers to
  // the applicant's program's own custom FORM-group fields, keyed by
  // AdmissionFormField.key. Empty object for a program with none — the
  // existing 9-step flow never populates or reads this.
  customFields: Record<string, unknown>
}

// ─── Step Component Props ────────────────────────────────────────────────────
export interface StepComponentProps {
  onNext: () => void
  onPrev: () => void
  isFirst: boolean
  isLast: boolean
}
