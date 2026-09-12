/* ------------------------------------------------------------------ */
/*  Admission Module — Type Definitions                                */
/* ------------------------------------------------------------------ */

export type PaymentStatus = "unpaid" | "pending" | "partial" | "paid" | "failed"
export type AdmissionOfferStatus =
  | "pending"
  | "offered"
  | "rejected"
  | "accepted"
  | "declined"
  | "expired"
export type ApplicationStatus = "not_started" | "submitted" | "under_review"

/** Represents a single fee item from the API */
export interface FeeItem {
  id: string
  name: string
  slug: string
  amount: number
  currency: string
  description?: string
}

/** Complete fee schedule returned by the backend */
export interface FeeSchedule {
  session: string
  fees: FeeItem[]
}

export type EntryMode = "UTME" | "DIRECT_ENTRY" | "TRANSFER"
export type StudyMode = "online" | "offline"

/** Student's admission progress from the backend */
export interface AdmissionStudent {
  id: string
  name: string
  email: string
  department: string
  faculty: string
  application_payment_status: PaymentStatus
  application_status: ApplicationStatus
  admission_status: AdmissionOfferStatus
  acceptance_payment_status: PaymentStatus
  tuition_payment_status: PaymentStatus
  tuition_amount_paid: number
  has_applied: boolean
  is_admitted: boolean
  session: string
  offer_expiry_date: string | null
  /**
   * Pre-application program choice — set once the applicant completes the
   * "Choice Program" process step, before they've paid or applied. Not part
   * of the live backend contract yet; see sandbox/MISSING_BACKEND_APIS.md
   * §2.5 for the proposed GET /admission/student field additions.
   */
  has_selected_program: boolean
  program_id: number | null
  program_name: string | null
  entry_mode: EntryMode | null
  study_mode: StudyMode | null
  start_term: string | null
}

/** Payment initiation response from the backend */
export interface PaymentInitiationResponse {
  success: boolean
  reference: string
  gateway_url: string
  message?: string
}

/** Payment verification response from the backend */
export interface PaymentVerificationResponse {
  success: boolean
  status: PaymentStatus
  reference: string
  amount: number
  message?: string
}

/**
 * Admission workflow steps. Values are the exact `key` strings used by the
 * admin-configurable step registry (src/services/admissionStepsApi.ts) —
 * unlike the old numeric enum this replaced, the actual sequence of these
 * steps is NOT fixed here. It's derived at runtime from each step's `order`
 * field (see admissionStore.ts's deriveStep and AdmissionStepIndicator.tsx),
 * so admin reordering genuinely changes what an applicant sees next.
 */
export const AdmissionStep = {
  CHOICE_PROGRAM: "CHOICE_PROGRAM",
  APPLICATION_PAYMENT: "APPLICATION_PAYMENT",
  APPLICATION_FORM: "APPLICATION_FORM",
  ADMISSION_STATUS: "ADMISSION_STATUS",
  ACCEPTANCE_FEE: "ACCEPTANCE_FEE",
  TUITION_PAYMENT: "TUITION_PAYMENT",
  COMPLETED: "COMPLETED",
} as const
export type AdmissionStep = (typeof AdmissionStep)[keyof typeof AdmissionStep]

/** Props shared by all step section components */
export interface StepSectionProps {
  student: AdmissionStudent
  fees: FeeSchedule
  onRefresh: () => void
}
