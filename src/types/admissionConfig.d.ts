// ──────────────────────────────────────────────
// Admission Process / Application Form — Step Registry
// Controls which steps students see in:
//   - src/app/(admission)/(routes)/process-admission/page.tsx
//   - src/app/(admission)/(routes)/admission-application-form/page.tsx
// Full CRUD — see src/services/admissionStepsApi.ts, backed by the live
// GET/POST/PATCH/DELETE /admissions/config/steps endpoints documented in
// sandbox/admission/admission_features_workflow.md.
//
// Multi-Program Platform (sandbox/multi-program-platform/) additions:
// programCategory/programId scoping on steps, and the FORM-group field
// registry (AdmissionFormField) that replaces the old fixed 9-step wizard
// with admin-composable fields. Designed 2026-09-11, backend not yet
// shipped — see BACKEND_REQUIRED_ENDPOINTS.md in that folder.
// ──────────────────────────────────────────────

import type { ProgramCategory } from "./school"

export type AdmissionStepGroup = "PROCESS" | "FORM"

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
  // null on both = institution-wide default. Only meaningful on the raw
  // admin-management list (GET /admissions/config/steps); the resolved
  // `effective` endpoint's rows omit these — see EffectiveAdmissionStep.
  programCategory?: ProgramCategory | null
  programId?: number | null
  // FORM-group steps only — the field registry that replaced fixed Zod
  // schemas per step. Absent/empty on the raw admin list unless expanded;
  // always present (possibly []) on the `effective` resolution.
  fields?: AdmissionFormField[]
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
}

export type UpdateAdmissionStepPayload = Partial<
  Omit<CreateAdmissionStepPayload, "group">
> & { order?: number }

// ──────────────────────────────────────────────
// Dynamic application form fields (Multi-Program Platform §B)
// One AdmissionFormField per question a FORM-group step asks. Replaces the
// old fixed-per-step Zod schema — a program's admin composes these instead
// of a developer hardcoding a new step component.
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
}

export interface AdmissionFormField {
  id: number
  stepId: number
  key: string
  label: string
  type: FormFieldType
  order: number
  isRequired: boolean
  helpText: string | null
  /** SELECT / MULTISELECT only. */
  options: FormFieldOption[] | null
  validation: FormFieldValidation | null
  /** Applicant can add multiple entries (e.g. "prior qualifications"). */
  repeatable: boolean
}

export type CreateAdmissionFormFieldPayload = Omit<AdmissionFormField, "id" | "stepId">
export type UpdateAdmissionFormFieldPayload = Partial<CreateAdmissionFormFieldPayload>
