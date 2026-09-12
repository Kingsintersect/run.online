import type { AdmissionStepDefinition } from "@/types/admissionConfig"

/* ------------------------------------------------------------------ */
/*  Catalog of the app's built-in ("known") step keys — the ones with a  */
/*  hand-built section component on the student pages. Two uses:         */
/*   1. KNOWN_PROCESS_STEP_KEYS / KNOWN_FORM_STEP_KEYS below, so the      */
/*      admin config UI can badge admin-created steps as "Custom".       */
/*   2. StepFormModal's create-time "Step Type" picker — selecting one   */
/*      of these fixes the new step's `key` to the exact value its real  */
/*      gating/screen logic expects, instead of deriving it from a       */
/*      free-text label (which a typo can silently break — see           */
/*      admission_features_workflow.md's "known step keys" note).        */
/*  This is NOT live data and must never be used as a fallback for the   */
/*  real step registry — src/services/admissionStepsApi.ts (backed by    */
/*  the live GET /admissions/config/steps endpoint) is the single        */
/*  source of truth for what students actually see.                      */
/* ------------------------------------------------------------------ */

export const DEFAULT_ADMISSION_STEPS: AdmissionStepDefinition[] = [
  // ─── Process steps ────────────────────────────────────────────────
  {
    id: 0,
    group: "PROCESS",
    key: "CHOICE_PROGRAM",
    label: "Choice Program",
    description:
      "Applicant selects their desired program, entry mode, and study mode before paying the application fee.",
    icon: "Settings",
    enabled: true,
    required: false,
    order: 0,
  },
  {
    id: 1,
    group: "PROCESS",
    key: "APPLICATION_PAYMENT",
    label: "Application Fee",
    description:
      "Applicant pays the non-refundable application processing fee before the form unlocks.",
    icon: "CreditCard",
    enabled: true,
    required: false,
    order: 1,
  },
  {
    id: 2,
    group: "PROCESS",
    key: "APPLICATION_FORM",
    label: "Application Form",
    description:
      "Applicant completes the multi-step admission application form.",
    icon: "FileText",
    enabled: true,
    required: true,
    order: 2,
  },
  {
    id: 3,
    group: "PROCESS",
    key: "ADMISSION_STATUS",
    label: "Admission Status",
    description:
      "Applicant waits for and views the admission office's review decision.",
    icon: "Search",
    enabled: true,
    required: true,
    order: 3,
  },
  {
    id: 4,
    group: "PROCESS",
    key: "ACCEPTANCE_FEE",
    label: "Acceptance Fee",
    description:
      "Admitted applicant pays the acceptance fee to confirm their offer.",
    icon: "BadgeCheck",
    enabled: true,
    required: false,
    order: 4,
  },
  {
    id: 5,
    group: "PROCESS",
    key: "TUITION_PAYMENT",
    label: "Tuition Payment",
    description:
      "Applicant pays tuition (installments supported) to complete enrollment.",
    icon: "GraduationCap",
    enabled: true,
    required: false,
    order: 5,
  },
  {
    id: 6,
    group: "PROCESS",
    key: "COMPLETED",
    label: "Completed",
    description:
      "Enrollment is complete and the student record has been created.",
    icon: "PartyPopper",
    enabled: true,
    required: true,
    order: 6,
  },

  // ─── Application form steps ───────────────────────────────────────
  {
    id: 7,
    group: "FORM",
    key: "PERSONAL_INFO",
    label: "Personal Information",
    description: "Basic details about the applicant.",
    icon: "User",
    enabled: true,
    required: true,
    order: 1,
  },
  {
    id: 8,
    group: "FORM",
    key: "SPONSOR_INFO",
    label: "Sponsor Information",
    description: "Details about the applicant's sponsor, if any.",
    icon: "Heart",
    enabled: true,
    required: false,
    order: 2,
  },
  {
    id: 9,
    group: "FORM",
    key: "NEXT_OF_KIN",
    label: "Next of Kin",
    description: "Emergency contact details.",
    icon: "Users",
    enabled: true,
    required: true,
    order: 3,
  },
  {
    id: 10,
    group: "FORM",
    key: "DOCUMENTS",
    label: "Documents",
    description:
      "Upload passport, first school leaving certificate, O-Level certificate.",
    icon: "FileText",
    enabled: true,
    required: true,
    order: 4,
  },
  {
    id: 11,
    group: "FORM",
    key: "QUALIFICATION_FIELDS",
    label: "Qualification Information",
    description: "The applicant's academic qualification details.",
    icon: "GraduationCap",
    enabled: true,
    required: true,
    order: 5,
  },
  {
    id: 12,
    group: "FORM",
    key: "EXAM_SITTING",
    label: "Exam Sitting",
    description: "O-Level examination sitting details.",
    icon: "BookOpen",
    enabled: true,
    required: false,
    order: 6,
  },
  {
    id: 13,
    group: "FORM",
    key: "QUALIFICATION_DOCUMENTS",
    label: "Qualification Documents",
    description: "Upload academic qualification / exam result documents.",
    icon: "FolderOpen",
    enabled: true,
    required: false,
    order: 7,
  },
  {
    id: 14,
    group: "FORM",
    key: "PROGRAM_SELECTION",
    label: "Program Selection",
    description:
      "Applicant chooses their desired program, start term, and study mode.",
    icon: "Settings",
    enabled: true,
    required: true,
    order: 8,
  },
  {
    id: 15,
    group: "FORM",
    key: "REVIEW",
    label: "Review & Submit",
    description: "Applicant reviews all entered information before submitting.",
    icon: "CheckCircle",
    enabled: true,
    required: true,
    order: 9,
  },
]

/** Keys of steps whose group's rendering is a fixed, hand-built component keyed by this exact string — see admission_features_workflow.md's "known step keys" note. Anything else is a custom, admin-created step and falls back to a generic placeholder. */
export const KNOWN_PROCESS_STEP_KEYS = new Set(
  DEFAULT_ADMISSION_STEPS.filter((s) => s.group === "PROCESS").map((s) => s.key)
)
export const KNOWN_FORM_STEP_KEYS = new Set(
  DEFAULT_ADMISSION_STEPS.filter((s) => s.group === "FORM").map((s) => s.key)
)

export function sortByOrder(
  steps: AdmissionStepDefinition[]
): AdmissionStepDefinition[] {
  return [...steps].sort((a, b) => a.order - b.order)
}
