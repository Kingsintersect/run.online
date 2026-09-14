import type {
  ConditionOperator,
  FieldWidth,
  FileAccept,
  FormFieldOption,
  FormFieldType,
  OptionsSource,
  StageConfigByType,
  StageType,
} from "@/types/admissionConfig"

/* ------------------------------------------------------------------ */
/*  Dynamic Admission catalogs — sandbox/dynamic-admission/             */
/*                                                                     */
/*  Stage types and field types are code on both sides (README §4), so  */
/*  their labels/defaults live here. The system field catalog mirrors   */
/*  GET /admissions/config/system-fields (API_CONTRACTS §1.1) and is    */
/*  the fallback until that endpoint ships.                             */
/* ------------------------------------------------------------------ */

// ── Stage types ─────────────────────────────────────────────────────

export interface StageTypeDefinition<T extends StageType = StageType> {
  type: T
  label: string
  description: string
  /** Lucide icon name, from src/lib/admissionStepIcons.ts. */
  icon: string
  /** Whether a resolved process may contain more than one stage of this type. */
  multiple: boolean
  defaultConfig: StageConfigByType[T]
}

export const STAGE_TYPE_CATALOG: { [K in StageType]: StageTypeDefinition<K> } =
  {
    PROGRAM_CHOICE: {
      type: "PROGRAM_CHOICE",
      label: "Program choice",
      description: "The applicant picks their program before applying.",
      icon: "Settings",
      multiple: false,
      defaultConfig: {
        collectEntryMode: true,
        collectStudyMode: true,
        collectStartTerm: true,
      },
    },
    PAYMENT: {
      type: "PAYMENT",
      label: "Payment",
      description: "The applicant pays a fee.",
      icon: "CreditCard",
      multiple: true,
      defaultConfig: {
        feeCategory: "APPLICATION",
        feeTypeId: null,
        allowInstallments: false,
        minimumPercent: null,
      },
    },
    FORM: {
      type: "FORM",
      label: "Application form",
      description: "The applicant fills in the application form steps.",
      icon: "FileText",
      multiple: false,
      defaultConfig: {},
    },
    DECISION: {
      type: "DECISION",
      label: "Admission decision",
      description:
        "The applicant waits for the decision, then accepts or declines the offer.",
      icon: "Search",
      multiple: false,
      defaultConfig: { showOfferExpiry: true },
    },
    CONTENT: {
      type: "CONTENT",
      label: "Content page",
      description:
        "Instructions or a notice, with an optional “I have read this”.",
      icon: "BookOpen",
      multiple: true,
      defaultConfig: {
        title: "",
        body: "",
        requireAcknowledgement: false,
        acknowledgementLabel: "I have read and understood this",
      },
    },
    DOCUMENT_UPLOAD: {
      type: "DOCUMENT_UPLOAD",
      label: "Document upload",
      description: "The applicant uploads extra documents.",
      icon: "FolderOpen",
      multiple: true,
      defaultConfig: { documents: [] },
    },
    COMPLETE: {
      type: "COMPLETE",
      label: "Complete",
      description: "The finish screen. Always the last stage.",
      icon: "PartyPopper",
      multiple: false,
      defaultConfig: {
        message: "Your admission is complete.",
        ctaLabel: null,
        ctaHref: null,
      },
    },
  }

export const STAGE_TYPES: StageType[] = [
  "PROGRAM_CHOICE",
  "PAYMENT",
  "FORM",
  "DECISION",
  "CONTENT",
  "DOCUMENT_UPLOAD",
  "COMPLETE",
]

/** Seed mapping for today's built-in PROCESS keys — SCHEMA_CHANGES.md §6. */
export const BUILT_IN_STAGE_TYPE_BY_KEY: Record<string, StageType> = {
  CHOICE_PROGRAM: "PROGRAM_CHOICE",
  APPLICATION_PAYMENT: "PAYMENT",
  APPLICATION_FORM: "FORM",
  ADMISSION_STATUS: "DECISION",
  ACCEPTANCE_FEE: "PAYMENT",
  TUITION_PAYMENT: "PAYMENT",
  COMPLETED: "COMPLETE",
}

export const BUILT_IN_STAGE_CONFIG_BY_KEY: {
  [key: string]: StageConfigByType[StageType]
} = {
  CHOICE_PROGRAM: STAGE_TYPE_CATALOG.PROGRAM_CHOICE.defaultConfig,
  APPLICATION_PAYMENT: {
    feeCategory: "APPLICATION",
    feeTypeId: null,
    allowInstallments: false,
    minimumPercent: null,
  },
  APPLICATION_FORM: {},
  ADMISSION_STATUS: { showOfferExpiry: true },
  ACCEPTANCE_FEE: {
    feeCategory: "ACCEPTANCE",
    feeTypeId: null,
    allowInstallments: false,
    minimumPercent: null,
  },
  TUITION_PAYMENT: {
    feeCategory: "TUITION",
    feeTypeId: null,
    allowInstallments: true,
    minimumPercent: 50,
  },
  COMPLETED: {
    message: "Your admission is complete.",
    ctaLabel: "Go to my courses",
    ctaHref: "/student/courses",
  },
}

/** A PROCESS step's type — its own, or the built-in key's until the backend stores types. */
export function resolveStageType(step: {
  key: string
  type?: StageType | null
}): StageType | null {
  return step.type ?? BUILT_IN_STAGE_TYPE_BY_KEY[step.key] ?? null
}

export function defaultStageConfig<T extends StageType>(
  type: T
): StageConfigByType[T] {
  return structuredClone(STAGE_TYPE_CATALOG[type].defaultConfig)
}

export const FEE_CATEGORY_LABELS: Record<
  StageConfigByType["PAYMENT"]["feeCategory"],
  string
> = {
  APPLICATION: "Application fee",
  ACCEPTANCE: "Acceptance fee",
  TUITION: "Tuition",
  HOSTEL: "Hostel",
  CLEARANCE: "Clearance",
  OTHER: "Other",
}

/** "Medical report (optional)" → "medical_report_optional" — a valid field/document key. */
export function toSnakeKey(label: string): string {
  const key = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return /^[a-z]/.test(key) ? key : key ? `f_${key}` : ""
}

// ── Field types, option sources, conditions ─────────────────────────

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  EMAIL: "Email",
  PHONE: "Phone",
  NUMBER: "Number",
  DATE: "Date",
  YEAR: "Year",
  SELECT: "Dropdown",
  RADIO: "Single choice",
  MULTISELECT: "Multiple choice",
  BOOLEAN: "Yes / No",
  FILE: "File upload",
  REPEATING_GROUP: "Repeating group",
}

export const FIELD_TYPES: FormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "YEAR",
  "SELECT",
  "RADIO",
  "MULTISELECT",
  "BOOLEAN",
  "FILE",
  "REPEATING_GROUP",
]

export const CHOICE_FIELD_TYPES: FormFieldType[] = [
  "SELECT",
  "RADIO",
  "MULTISELECT",
]

export const OPTIONS_SOURCES: {
  source: OptionsSource
  label: string
  /** The option source the `dependsOn` field must use, when one is needed. */
  needs: OptionsSource | null
}[] = [
  { source: "COUNTRIES", label: "Countries", needs: null },
  { source: "STATES", label: "States (of a country)", needs: "COUNTRIES" },
  { source: "LGAS", label: "Local governments (of a state)", needs: "STATES" },
  { source: "PROGRAMS", label: "Programs", needs: null },
  { source: "SESSIONS", label: "Academic sessions", needs: null },
  { source: "ENTRY_MODES", label: "Entry modes", needs: null },
  { source: "EXAM_TYPES", label: "O-Level exam types", needs: null },
]

export const CONDITION_OPERATORS: {
  op: ConditionOperator
  label: string
  needsValue: boolean
}[] = [
  { op: "equals", label: "is", needsValue: true },
  { op: "notEquals", label: "is not", needsValue: true },
  { op: "in", label: "is one of", needsValue: true },
  { op: "notIn", label: "is none of", needsValue: true },
  { op: "isTrue", label: "is Yes", needsValue: false },
  { op: "isFalse", label: "is No", needsValue: false },
  { op: "isNotEmpty", label: "is answered", needsValue: false },
  { op: "isEmpty", label: "is not answered", needsValue: false },
]

export const FILE_ACCEPT_LABELS: Record<FileAccept, string> = {
  IMAGE: "Images only",
  DOCUMENT: "Documents (PDF, DOC, DOCX or images)",
  ANY: "Any file",
}

export const FIELD_WIDTH_LABELS: Record<FieldWidth, string> = {
  FULL: "Full width",
  HALF: "Half width",
}

// ── System fields — SCHEMA_CHANGES.md §3 ────────────────────────────

export interface SystemFieldDefinition {
  systemKey: string
  label: string
  type: FormFieldType
  lockedRequired: boolean
  /** The field key used when seeding it — SCHEMA_CHANGES.md §6. */
  suggestedKey: string
  defaultStepKey: string
  optionsSource: OptionsSource | null
  dependsOnSystemKey: string | null
  options?: FormFieldOption[]
  accept?: FileAccept
  multiple?: boolean
}

const opts = (...values: string[]): FormFieldOption[] =>
  values.map((value) => ({ value, label: value }))

const RELATIONSHIP_OPTIONS = opts(
  "Parent",
  "Sibling",
  "Spouse",
  "Guardian",
  "Uncle",
  "Aunt",
  "Other"
)

const system = (
  def: Omit<SystemFieldDefinition, "optionsSource" | "dependsOnSystemKey"> &
    Partial<Pick<SystemFieldDefinition, "optionsSource" | "dependsOnSystemKey">>
): SystemFieldDefinition => ({
  optionsSource: null,
  dependsOnSystemKey: null,
  ...def,
})

export const SYSTEM_FIELD_CATALOG: SystemFieldDefinition[] = [
  // Program choice (only asked in the form when there's no PROGRAM_CHOICE stage)
  system({
    systemKey: "programId",
    label: "Program",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "program_id",
    defaultStepKey: "PROGRAM_SELECTION",
    optionsSource: "PROGRAMS",
  }),
  system({
    systemKey: "entryMode",
    label: "Entry mode",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "entry_mode",
    defaultStepKey: "PROGRAM_SELECTION",
    optionsSource: "ENTRY_MODES",
  }),
  system({
    systemKey: "startTerm",
    label: "Start term",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "start_term",
    defaultStepKey: "PROGRAM_SELECTION",
    optionsSource: "SESSIONS",
  }),
  system({
    systemKey: "studyMode",
    label: "Study mode",
    type: "RADIO",
    lockedRequired: true,
    suggestedKey: "study_mode",
    defaultStepKey: "PROGRAM_SELECTION",
    options: [
      { value: "online", label: "Online" },
      { value: "offline", label: "On campus" },
    ],
  }),

  // Personal information
  system({
    systemKey: "nationality",
    label: "Nationality",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "nationality",
    defaultStepKey: "PERSONAL_INFO",
    optionsSource: "COUNTRIES",
  }),
  system({
    systemKey: "stateOfOrigin",
    label: "State of origin",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "state_of_origin",
    defaultStepKey: "PERSONAL_INFO",
    optionsSource: "STATES",
    dependsOnSystemKey: "nationality",
  }),
  system({
    systemKey: "lga",
    label: "Local government area",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "lga",
    defaultStepKey: "PERSONAL_INFO",
    optionsSource: "LGAS",
    dependsOnSystemKey: "stateOfOrigin",
  }),
  system({
    systemKey: "religion",
    label: "Religion",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "religion",
    defaultStepKey: "PERSONAL_INFO",
    options: opts("Christianity", "Islam", "Traditional", "Other"),
  }),
  system({
    systemKey: "dob",
    label: "Date of birth",
    type: "DATE",
    lockedRequired: true,
    suggestedKey: "dob",
    defaultStepKey: "PERSONAL_INFO",
  }),
  system({
    systemKey: "gender",
    label: "Gender",
    type: "RADIO",
    lockedRequired: true,
    suggestedKey: "gender",
    defaultStepKey: "PERSONAL_INFO",
    options: opts("Male", "Female"),
  }),
  system({
    systemKey: "hometown",
    label: "Hometown",
    type: "TEXT",
    lockedRequired: true,
    suggestedKey: "hometown",
    defaultStepKey: "PERSONAL_INFO",
  }),
  system({
    systemKey: "hometownAddress",
    label: "Hometown address",
    type: "TEXTAREA",
    lockedRequired: true,
    suggestedKey: "hometown_address",
    defaultStepKey: "PERSONAL_INFO",
  }),
  system({
    systemKey: "contactAddress",
    label: "Contact address",
    type: "TEXTAREA",
    lockedRequired: true,
    suggestedKey: "contact_address",
    defaultStepKey: "PERSONAL_INFO",
  }),
  system({
    systemKey: "hasDisability",
    label: "Do you have a disability?",
    type: "BOOLEAN",
    lockedRequired: false,
    suggestedKey: "has_disability",
    defaultStepKey: "PERSONAL_INFO",
  }),
  system({
    systemKey: "disability",
    label: "Describe your disability",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "disability",
    defaultStepKey: "PERSONAL_INFO",
  }),

  // Sponsor
  system({
    systemKey: "hasSponsor",
    label: "Do you have a sponsor?",
    type: "BOOLEAN",
    lockedRequired: false,
    suggestedKey: "has_sponsor",
    defaultStepKey: "SPONSOR_INFO",
  }),
  system({
    systemKey: "sponsorName",
    label: "Sponsor's name",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "sponsor_name",
    defaultStepKey: "SPONSOR_INFO",
  }),
  system({
    systemKey: "sponsorRelationship",
    label: "Sponsor's relationship",
    type: "SELECT",
    lockedRequired: false,
    suggestedKey: "sponsor_relationship",
    defaultStepKey: "SPONSOR_INFO",
    options: RELATIONSHIP_OPTIONS,
  }),
  system({
    systemKey: "sponsorEmail",
    label: "Sponsor's email",
    type: "EMAIL",
    lockedRequired: false,
    suggestedKey: "sponsor_email",
    defaultStepKey: "SPONSOR_INFO",
  }),
  system({
    systemKey: "sponsorContactAddress",
    label: "Sponsor's contact address",
    type: "TEXTAREA",
    lockedRequired: false,
    suggestedKey: "sponsor_contact_address",
    defaultStepKey: "SPONSOR_INFO",
  }),
  system({
    systemKey: "sponsorPhoneNumber",
    label: "Sponsor's phone number",
    type: "PHONE",
    lockedRequired: false,
    suggestedKey: "sponsor_phone_number",
    defaultStepKey: "SPONSOR_INFO",
  }),

  // Next of kin
  system({
    systemKey: "nextOfKinName",
    label: "Next of kin's full name",
    type: "TEXT",
    lockedRequired: true,
    suggestedKey: "next_of_kin_name",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinRelationship",
    label: "Relationship",
    type: "SELECT",
    lockedRequired: true,
    suggestedKey: "next_of_kin_relationship",
    defaultStepKey: "NEXT_OF_KIN",
    options: RELATIONSHIP_OPTIONS,
  }),
  system({
    systemKey: "nextOfKinPhoneNumber",
    label: "Phone number",
    type: "PHONE",
    lockedRequired: true,
    suggestedKey: "next_of_kin_phone_number",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinAddress",
    label: "Address",
    type: "TEXTAREA",
    lockedRequired: true,
    suggestedKey: "next_of_kin_address",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinEmail",
    label: "Email",
    type: "EMAIL",
    lockedRequired: false,
    suggestedKey: "next_of_kin_email",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "isNextOfKinPrimaryContact",
    label: "Primary contact",
    type: "BOOLEAN",
    lockedRequired: false,
    suggestedKey: "is_next_of_kin_primary_contact",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinAlternatePhoneNumber",
    label: "Alternate phone number",
    type: "PHONE",
    lockedRequired: false,
    suggestedKey: "next_of_kin_alternate_phone_number",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinOccupation",
    label: "Occupation",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "next_of_kin_occupation",
    defaultStepKey: "NEXT_OF_KIN",
  }),
  system({
    systemKey: "nextOfKinWorkplace",
    label: "Workplace",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "next_of_kin_workplace",
    defaultStepKey: "NEXT_OF_KIN",
  }),

  // Documents
  system({
    systemKey: "passport",
    label: "Passport photograph",
    type: "FILE",
    lockedRequired: true,
    suggestedKey: "passport",
    defaultStepKey: "DOCUMENTS",
    accept: "IMAGE",
  }),
  system({
    systemKey: "firstSchoolLeaving",
    label: "First school leaving certificate",
    type: "FILE",
    lockedRequired: false,
    suggestedKey: "first_school_leaving",
    defaultStepKey: "DOCUMENTS",
    accept: "DOCUMENT",
  }),
  system({
    systemKey: "oLevel",
    label: "O-Level certificate",
    type: "FILE",
    lockedRequired: false,
    suggestedKey: "o_level",
    defaultStepKey: "DOCUMENTS",
    accept: "DOCUMENT",
  }),
  system({
    systemKey: "otherDocuments",
    label: "Other documents",
    type: "FILE",
    lockedRequired: false,
    suggestedKey: "other_documents",
    defaultStepKey: "DOCUMENTS",
    accept: "DOCUMENT",
    multiple: true,
  }),

  // Qualifications
  system({
    systemKey: "awaitingResult",
    label: "Awaiting result?",
    type: "BOOLEAN",
    lockedRequired: false,
    suggestedKey: "awaiting_result",
    defaultStepKey: "QUALIFICATION_FIELDS",
  }),
  system({
    systemKey: "combinedResult",
    label: "Result type",
    type: "RADIO",
    lockedRequired: false,
    suggestedKey: "combined_result",
    defaultStepKey: "QUALIFICATION_FIELDS",
    options: [
      { value: "single_result", label: "Single result" },
      { value: "combined_result", label: "Combined result" },
    ],
  }),
  system({
    systemKey: "firstSittingType",
    label: "First sitting exam type",
    type: "SELECT",
    lockedRequired: false,
    suggestedKey: "first_sitting_type",
    defaultStepKey: "EXAM_SITTING",
    optionsSource: "EXAM_TYPES",
  }),
  system({
    systemKey: "firstSittingYear",
    label: "First sitting year",
    type: "YEAR",
    lockedRequired: false,
    suggestedKey: "first_sitting_year",
    defaultStepKey: "EXAM_SITTING",
  }),
  system({
    systemKey: "firstSittingExamNumber",
    label: "First sitting exam number",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "first_sitting_exam_number",
    defaultStepKey: "EXAM_SITTING",
  }),
  system({
    systemKey: "secondSittingType",
    label: "Second sitting exam type",
    type: "SELECT",
    lockedRequired: false,
    suggestedKey: "second_sitting_type",
    defaultStepKey: "EXAM_SITTING",
    optionsSource: "EXAM_TYPES",
  }),
  system({
    systemKey: "secondSittingYear",
    label: "Second sitting year",
    type: "YEAR",
    lockedRequired: false,
    suggestedKey: "second_sitting_year",
    defaultStepKey: "EXAM_SITTING",
  }),
  system({
    systemKey: "secondSittingExamNumber",
    label: "Second sitting exam number",
    type: "TEXT",
    lockedRequired: false,
    suggestedKey: "second_sitting_exam_number",
    defaultStepKey: "EXAM_SITTING",
  }),
  system({
    systemKey: "firstSittingResult",
    label: "First sitting result",
    type: "FILE",
    lockedRequired: false,
    suggestedKey: "first_sitting_result",
    defaultStepKey: "QUALIFICATION_DOCUMENTS",
    accept: "DOCUMENT",
  }),
  system({
    systemKey: "secondSittingResult",
    label: "Second sitting result",
    type: "FILE",
    lockedRequired: false,
    suggestedKey: "second_sitting_result",
    defaultStepKey: "QUALIFICATION_DOCUMENTS",
    accept: "DOCUMENT",
  }),
]
