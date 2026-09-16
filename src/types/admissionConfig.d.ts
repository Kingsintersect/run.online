// ──────────────────────────────────────────────
// Admission Process / Application Form — Step Registry
// Controls which steps students see in:
//   - src/app/(admission)/(routes)/process-admission/page.tsx
//   - src/app/(admission)/(routes)/admission-application-form/page.tsx
// Full CRUD — see src/services/admissionStepsApi.ts, backed by the live
// GET/POST/PATCH/DELETE /admissions/config/steps endpoints documented in
// sandbox/admission/admission_features_workflow.md.
//
// Multi-Program Platform (sandbox/multi-program-platform/): scoping on
// steps and the FORM-group field registry (AdmissionFormField).
// Dynamic Admission (sandbox/dynamic-admission/): typed PROCESS stages with
// per-type config, and bound/conditional form fields.
// ──────────────────────────────────────────────

import type { ProgramCategory } from "./school"

export type AdmissionStepGroup = "PROCESS" | "FORM"

// ── Typed process stages (Dynamic Admission — SCHEMA_CHANGES.md §2) ──

export type StageType =
  | "MAJOR_PROGRAM_CHOICE"
  | "PROGRAM_CHOICE"
  | "PAYMENT"
  | "FORM"
  | "DECISION"
  | "CONTENT"
  | "DOCUMENT_UPLOAD"
  | "COMPLETE"

export type AdmissionFeeCategory =
  | "APPLICATION"
  | "ACCEPTANCE"
  | "TUITION"
  | "HOSTEL"
  | "CLEARANCE"
  | "OTHER"

export type FileAccept = "IMAGE" | "DOCUMENT" | "ANY"

// Major-Program Scoping — sandbox/major-program-scoping/. Picking a major
// program (Degree, Part-Time, Certificate, …) before a specific program is
// a separate step from PROGRAM_CHOICE below: an institution with more than
// one major program needs it first so PROGRAM_CHOICE's own picker can
// narrow to that major program's programs, and so later stages/the
// application form resolve against the right one. No settings of its own —
// see MajorProgramChoiceSection.tsx.
export type MajorProgramChoiceStageConfig = Record<string, never>

export interface ProgramChoiceStageConfig {
  collectEntryMode: boolean
  collectStudyMode: boolean
  collectStartTerm: boolean
}

export interface PaymentStageConfig {
  feeCategory: AdmissionFeeCategory
  /** A specific fee type; null = the applicant's fee type in `feeCategory`. */
  feeTypeId?: number | null
  allowInstallments: boolean
  /** Minimum share of the fee the first installment must cover. */
  minimumPercent?: number | null
}

export type FormStageConfig = Record<string, never>

export interface DecisionStageConfig {
  showOfferExpiry: boolean
}

export interface ContentStageConfig {
  title: string
  /** Markdown. */
  body: string
  requireAcknowledgement: boolean
  acknowledgementLabel?: string | null
}

export interface StageDocumentRequirement {
  key: string
  label: string
  accept: FileAccept
  required: boolean
  maxSizeMb?: number | null
}

export interface DocumentUploadStageConfig {
  documents: StageDocumentRequirement[]
}

export interface CompleteStageConfig {
  message: string
  ctaLabel?: string | null
  ctaHref?: string | null
}

export interface StageConfigByType {
  MAJOR_PROGRAM_CHOICE: MajorProgramChoiceStageConfig
  PROGRAM_CHOICE: ProgramChoiceStageConfig
  PAYMENT: PaymentStageConfig
  FORM: FormStageConfig
  DECISION: DecisionStageConfig
  CONTENT: ContentStageConfig
  DOCUMENT_UPLOAD: DocumentUploadStageConfig
  COMPLETE: CompleteStageConfig
}

export type StageConfig = StageConfigByType[StageType]

export interface AdmissionStepDefinition {
  id: number
  group: AdmissionStepGroup
  key: string
  label: string
  description: string
  /** Lucide icon name — see src/lib/admissionStepIcons.ts for the picker/lookup list. */
  icon: string
  enabled: boolean
  /** Non-negotiable step — cannot be disabled or deleted (switch/delete render locked). */
  required: boolean
  /** Display/navigation order within its group, ascending. */
  order: number
  // ── Multi-Program Platform scoping ──────────────────────────────────
  // null on all three = institution-wide default. Only meaningful on the raw
  // admin-management list (GET /admissions/config/steps); the resolved
  // `effective` endpoint's rows omit these — see EffectiveAdmissionStep.
  programCategory?: ProgramCategory | null
  programId?: number | null
  // Major-Program Scoping (sandbox/major-program-scoping/,
  // sandbox/dynamic-admission/ addendum) — BACKEND_DEVIATIONS A22, new
  // 2026-09-15. The primary scoping axis for admission configuration going
  // forward: an admin picks one major program and configures its own
  // process/form steps (and, via each FORM step, its own fields), applying
  // to every applicant who chose that major program via the
  // MAJOR_PROGRAM_CHOICE stage. Resolution priority, most specific first:
  // programId > majorProgramId > programCategory > default (unchanged —
  // additive, not a replacement for the other two, which stay real for any
  // deployment that already uses them).
  majorProgramId?: number | null
  // FORM-group steps only — the field registry that replaced fixed Zod
  // schemas per step. Absent/empty on the raw admin list unless expanded;
  // always present (possibly []) on the `effective` resolution.
  fields?: AdmissionFormField[]
  // PROCESS-group steps only. Null until the backend ships typed stages —
  // built-in keys are typed client-side via resolveStageType().
  type?: StageType | null
  config?: StageConfig | null
}

/** @deprecated kept as an alias while older code migrates — same shape as AdmissionStepDefinition. */
export type AdmissionStepToggle = AdmissionStepDefinition

/**
 * A step as returned by GET /admissions/config/steps/effective — the
 * server-resolved (programId > programCategory > institution-default)
 * merge for one applicant. No scope/enabled fields — the caller gets a
 * final answer, not raw configuration to re-filter. See
 * sandbox/multi-program-platform/API_CONTRACTS.md §A.
 */
export interface EffectiveAdmissionStep {
  id: number
  group: AdmissionStepGroup
  key: string
  order: number
  label: string
  description: string
  icon: string
  required: boolean
  fields?: AdmissionFormField[]
  type?: StageType | null
  config?: StageConfig | null
}

export interface AdmissionConfig {
  processSteps: AdmissionStepDefinition[]
  formSteps: AdmissionStepDefinition[]
}

export interface CreateAdmissionStepPayload {
  group: AdmissionStepGroup
  key: string
  /** Display/navigation order within its group — the backend requires this on create, it isn't auto-assigned. */
  order: number
  label: string
  description: string
  icon: string
  required: boolean
  enabled: boolean
  /** Omit/null = institution-wide default — see AdmissionStepDefinition above. */
  programCategory?: ProgramCategory | null
  programId?: number | null
  majorProgramId?: number | null
  /** PROCESS only; immutable after creation. */
  type?: StageType | null
  config?: StageConfig | null
}

export type UpdateAdmissionStepPayload = Partial<
  Omit<CreateAdmissionStepPayload, "group" | "type">
> & { order?: number }

// ──────────────────────────────────────────────
// Dynamic application form fields (Multi-Program Platform §B, extended by
// Dynamic Admission SCHEMA_CHANGES.md §1). One AdmissionFormField per
// question a FORM-group step asks.
// ──────────────────────────────────────────────

export type FormFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "MULTISELECT"
  | "FILE"
  | "REPEATING_GROUP"
  | "BOOLEAN"
  | "RADIO"
  | "YEAR"

export type FieldWidth = "FULL" | "HALF"

export type OptionsSource =
  | "COUNTRIES"
  | "STATES"
  | "LGAS"
  | "PROGRAMS"
  | "SESSIONS"
  | "ENTRY_MODES"
  | "EXAM_TYPES"

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormFieldValidation {
  min?: number
  max?: number
  pattern?: string
  minDate?: string
  maxDate?: string
  minLength?: number
  maxLength?: number
  /** FILE only. */
  accept?: FileAccept
  /** FILE only. Defaults to 5 server-side. */
  maxSizeMb?: number
  /** FILE only. */
  multiple?: boolean
  /** REPEATING_GROUP / multiple FILE. */
  maxItems?: number
}

export type ConditionOperator =
  | "equals"
  | "notEquals"
  | "in"
  | "notIn"
  | "isTrue"
  | "isFalse"
  | "isEmpty"
  | "isNotEmpty"

/** `visibleWhen` — SCHEMA_CHANGES.md §4. `field` is another field's `key`, earlier in the form. */
export type FieldCondition =
  | {
      field: string
      op: "equals" | "notEquals"
      value: string | number | boolean
    }
  | { field: string; op: "in" | "notIn"; value: (string | number)[] }
  | { field: string; op: "isTrue" | "isFalse" | "isEmpty" | "isNotEmpty" }
  | { all: FieldCondition[] }
  | { any: FieldCondition[] }

export interface AdmissionFormField {
  id: number
  stepId: number
  key: string
  label: string
  type: FormFieldType
  order: number
  isRequired: boolean
  helpText: string | null
  /** SELECT / MULTISELECT / RADIO with no `optionsSource`. */
  options: FormFieldOption[] | null
  validation: FormFieldValidation | null
  /** Applicant can add multiple entries (e.g. "prior qualifications"). */
  repeatable: boolean
  // ── Dynamic Admission additions — optional until the backend ships them ──
  isActive?: boolean
  /** Binds the answer to a real Application column — see src/lib/admission-catalog.ts. */
  systemKey?: string | null
  /** Set by the backend from the catalog: `isRequired` can't be turned off. */
  lockedRequired?: boolean
  placeholder?: string | null
  width?: FieldWidth
  defaultValue?: string | number | boolean | null
  visibleWhen?: FieldCondition | null
  optionsSource?: OptionsSource | null
  /** Key of an earlier field feeding `optionsSource` (e.g. STATES ← nationality). */
  dependsOn?: string | null
  /** Child of a REPEATING_GROUP field (one level only). */
  parentFieldId?: number | null
  children?: AdmissionFormField[]
}

export type CreateAdmissionFormFieldPayload = Omit<
  AdmissionFormField,
  "id" | "stepId" | "children" | "lockedRequired" | "isActive"
>
export type UpdateAdmissionFormFieldPayload = Partial<
  Omit<CreateAdmissionFormFieldPayload, "key" | "type" | "systemKey">
>
