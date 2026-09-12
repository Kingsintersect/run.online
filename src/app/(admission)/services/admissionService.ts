/* ------------------------------------------------------------------ */
/*  Admission Module — API Service                                     */
/*                                                                     */
/*  fetchFees/fetchStudentAdmission/initiate*Payment/verify*Payment/    */
/*  declineAdmission all call the real backend — see sandbox/admission/ */
/*  student_admission_workflow.md for the spec these were built from.  */
/*  devSimulate*()/devResetAll() remain frontend-only dev fixtures,     */
/*  gated on NODE_ENV === "development" at the call sites — they are   */
/*  never meant to have backend support.                               */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  AdmissionStudent,
  EntryMode,
  FeeSchedule,
  PaymentInitiationResponse,
  PaymentVerificationResponse,
  PaymentStatus,
  StudyMode,
} from "../types/admission"
const AUTH = { access_token: true } as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

// POST /fees/payments/verify/:reference (fee_README.md "Payments" table) returns
// a payment/invoice-shaped body, not the frontend's PaymentVerificationResponse —
// adapt it here. Shared by all three verify*Payment() methods below since the
// wrapped payment/invoice shape is identical regardless of fee type.
interface RealVerifyPaymentResponse {
  paymentId: number
  status: "COMPLETED" | "FAILED" | "PENDING"
  invoice: {
    id: number
    amountPaid: string
    status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE"
  }
}

const VERIFY_STATUS_MAP: Record<
  RealVerifyPaymentResponse["status"],
  PaymentStatus
> = {
  COMPLETED: "paid",
  FAILED: "failed",
  PENDING: "pending",
}

const VERIFY_MESSAGE_MAP: Record<RealVerifyPaymentResponse["status"], string> =
  {
    COMPLETED: "Payment verified successfully",
    FAILED: "Payment failed. Please try again.",
    PENDING: "Payment is still pending confirmation.",
  }

async function verifyGatewayPayment(
  reference: string
): Promise<PaymentVerificationResponse> {
  // Body is only consulted for non-GATEWAY (manual) verification — a GATEWAY
  // payment (the only kind this student-facing flow ever creates) is
  // re-checked server-to-server against Credo regardless, so no body is sent.
  const result = await apiClient.post<RealVerifyPaymentResponse>(
    `/fees/payments/verify/${reference}`,
    undefined,
    AUTH
  )
  return {
    success: result.status === "COMPLETED",
    status: VERIFY_STATUS_MAP[result.status],
    reference,
    amount: Number(result.invoice.amountPaid),
    message: VERIFY_MESSAGE_MAP[result.status],
  }
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA — dev-only fixtures, see devSimulate*()/devResetAll() below   */
/* ------------------------------------------------------------------ */

let mockStudent: AdmissionStudent = {
  id: "std-001",
  name: "Chukwuemeka Okonkwo",
  email: "c.okonkwo@students.unilag.edu.ng",
  department: "Computer Science",
  faculty: "Science",
  application_payment_status: "unpaid",
  application_status: "not_started",
  admission_status: "pending",
  acceptance_payment_status: "unpaid",
  tuition_payment_status: "unpaid",
  tuition_amount_paid: 0,
  has_applied: false,
  is_admitted: false,
  session: "2025/2026",
  offer_expiry_date: null,
  has_selected_program: false,
  program_id: null,
  program_name: null,
  entry_mode: null,
  study_mode: null,
  start_term: null,
}

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

export const admissionService = {
  /* ---------- Fees ---------- */
  async fetchFees(): Promise<FeeSchedule> {
    // Real API: GET /fees/types?scope=admission — Bruno: fee/Fee Types - List (Admission Scope).bru
    // Student Admission Progress spec §2. Returns {session, fees[]} directly (no data envelope).
    return apiClient.get<FeeSchedule>("/fees/types", {
      ...AUTH,
      params: { scope: "admission" },
    })
  },

  /* ---------- Student Data ---------- */
  async fetchStudentAdmission(): Promise<AdmissionStudent> {
    // Real API: GET /admission/student — Bruno: admission/Admission - Student Aggregate.bru
    // Student Admission Progress spec §3. Composed server-side. Confirmed live 2026-08-25:
    // wrapped in a `data` envelope like every other endpoint in this backend (the doc's
    // "returns AdmissionStudent directly" was never actually true) — unwrap it here.
    //
    // The has_selected_program/program_*/entry_mode/study_mode/start_term fields aren't
    // part of the live response yet (see sandbox/MISSING_BACKEND_APIS.md §2.5) — default
    // them defensively so the "Choice Program" step degrades to "not yet chosen" instead
    // of throwing, until the backend adds them. Typed as Partial here since the real
    // response genuinely omits them today, unlike the full AdmissionStudent contract.
    const { data } = await apiClient.get<{
      data: Omit<
        AdmissionStudent,
        | "has_selected_program"
        | "program_id"
        | "program_name"
        | "entry_mode"
        | "study_mode"
        | "start_term"
      > &
        Partial<
          Pick<
            AdmissionStudent,
            | "has_selected_program"
            | "program_id"
            | "program_name"
            | "entry_mode"
            | "study_mode"
            | "start_term"
          >
        >
    }>("/admission/student", AUTH)
    return {
      has_selected_program: false,
      program_id: null,
      program_name: null,
      entry_mode: null,
      study_mode: null,
      start_term: null,
      ...data,
    }
  },

  /* ---------- Submit pre-application program choice ---------- */
  async submitProgramChoice(payload: {
    programId: number
    entryMode: EntryMode
    studyMode: StudyMode
    startTerm: string
  }): Promise<AdmissionStudent> {
    // Proposed API: POST /admission/program-choice — not built on the backend yet, see
    // sandbox/REFACTOR_BACKEND_APIS.md for the full designed contract (tracked as
    // MISSING_BACKEND_APIS.md §2.17, a pointer to that doc — unlike the rest of
    // that file, this specific item has NOT been confirmed shipped). 404s until
    // the backend ships it; the frontend is wired against the designed shape already.
    const { data } = await apiClient.post<{ data: AdmissionStudent }>(
      "/admission/program-choice",
      payload,
      AUTH
    )
    return data
  },

  /* ---------- Dev-only: Simulate program choice made ---------- */
  async devSimulateProgramChosen(payload: {
    programId: number
    programName: string
    entryMode: EntryMode
    studyMode: StudyMode
    startTerm: string
  }): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      has_selected_program: true,
      program_id: payload.programId,
      program_name: payload.programName,
      entry_mode: payload.entryMode,
      study_mode: payload.studyMode,
      start_term: payload.startTerm,
    }
    return { ...mockStudent }
  },

  /* ---------- Initiate Application Payment ---------- */
  async initiateApplicationPayment(): Promise<PaymentInitiationResponse> {
    // Real API: POST /fees/payments/application/initiate — Bruno: fee/Payments - Initiate Application.bru
    return apiClient.post<PaymentInitiationResponse>(
      "/fees/payments/application/initiate",
      { method: "GATEWAY" },
      AUTH
    )
  },

  /* ---------- Verify Application Payment ---------- */
  async verifyApplicationPayment(
    reference: string
  ): Promise<PaymentVerificationResponse> {
    // Real API: POST /fees/payments/verify/:reference — Bruno: fee/Payments - Verify.bru
    return verifyGatewayPayment(reference)
  },

  /* ---------- Initiate Acceptance Fee Payment ---------- */
  async initiateAcceptanceFeePayment(): Promise<PaymentInitiationResponse> {
    // Real API: POST /fees/payments/acceptance/initiate — Bruno: fee/Payments - Initiate Acceptance.bru
    return apiClient.post<PaymentInitiationResponse>(
      "/fees/payments/acceptance/initiate",
      { method: "GATEWAY" },
      AUTH
    )
  },

  /* ---------- Verify Acceptance Fee Payment ---------- */
  async verifyAcceptanceFeePayment(
    reference: string
  ): Promise<PaymentVerificationResponse> {
    // Real API: POST /fees/payments/verify/:reference — Bruno: fee/Payments - Verify.bru
    return verifyGatewayPayment(reference)
  },

  /* ---------- Initiate Tuition Payment ---------- */
  async initiateTuitionPayment(
    amount: number
  ): Promise<PaymentInitiationResponse> {
    // Real API: POST /fees/payments/tuition/initiate — Bruno: fee/Payments - Initiate Tuition.bru
    // The bruno example body only shows {method: "GATEWAY"} (Tuition Fee has no
    // partial-payment example there) — `amount` is sent defensively so the
    // frontend's half/custom installment plan (TuitionPaymentSection.tsx) has a
    // chance of working; if the backend's DTO doesn't accept it yet, it should
    // either start accepting it or this needs a follow-up spec update.
    return apiClient.post<PaymentInitiationResponse>(
      "/fees/payments/tuition/initiate",
      { method: "GATEWAY", amount },
      AUTH
    )
  },

  /* ---------- Verify Tuition Payment ---------- */
  async verifyTuitionPayment(
    reference: string
  ): Promise<PaymentVerificationResponse> {
    // Real API: POST /fees/payments/verify/:reference — Bruno: fee/Payments - Verify.bru
    return verifyGatewayPayment(reference)
  },

  /* ---------- Dev-only: Simulate status changes ---------- */
  async devSimulateAppPaymentPaid(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      application_payment_status: "paid",
    }
    return { ...mockStudent }
  },

  async devSimulateApplied(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      has_applied: true,
      application_status: "submitted",
    }
    return { ...mockStudent }
  },

  async devSimulateAdmissionOffered(): Promise<AdmissionStudent> {
    await delay(500)
    // Set expiry to 14 days from now
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 14)
    mockStudent = {
      ...mockStudent,
      admission_status: "offered",
      is_admitted: true,
      offer_expiry_date: expiry.toISOString(),
    }
    return { ...mockStudent }
  },

  async devSimulateAdmissionAccepted(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      admission_status: "accepted",
      acceptance_payment_status: "paid",
    }
    return { ...mockStudent }
  },

  async devSimulateTuitionPaid(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      tuition_payment_status: "paid",
      tuition_amount_paid: 195_000,
    }
    return { ...mockStudent }
  },

  /* ---------- Accept Admission ---------- */
  async acceptAdmission(): Promise<AdmissionStudent> {
    // Real API: PATCH /admissions/:id/accept — admission_README.md "Admissions" table
    // (Bruno: admission/Admissions - Accept.bru). Same admissionId-resolution pattern
    // as declineAdmission() below. On success the backend auto-creates the applicant's
    // acceptance-fee invoice, so a fresh fetchStudentAdmission() picks that up too.
    const { data: admission } = await apiClient.get<{
      data: { id: number }
    }>("/admissions/my", AUTH)
    await apiClient.patch<{ data: unknown }>(
      `/admissions/${admission.id}/accept`,
      undefined,
      AUTH
    )
    return admissionService.fetchStudentAdmission()
  },

  /* ---------- Decline Admission ---------- */
  async declineAdmission(): Promise<AdmissionStudent> {
    // Real API: PATCH /admissions/:id/decline — admission_README.md "Admissions" table,
    // already a full match (Student Admission Progress spec §6) — the only reason this
    // couldn't be called before was not knowing the applicant's own admissionId, which
    // GET /admissions/my (Bruno: admission/Admissions - My.bru) now resolves.
    const { data: admission } = await apiClient.get<{
      data: { id: number }
    }>("/admissions/my", AUTH)
    await apiClient.patch<{ data: unknown }>(
      `/admissions/${admission.id}/decline`,
      undefined,
      AUTH
    )
    return admissionService.fetchStudentAdmission()
  },

  /* ---------- Dev-only: Simulate Declined ---------- */
  async devSimulateDeclined(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      admission_status: "declined",
      is_admitted: false,
      offer_expiry_date: null,
    }
    return { ...mockStudent }
  },

  /* ---------- Dev-only: Simulate Expired ---------- */
  async devSimulateExpired(): Promise<AdmissionStudent> {
    await delay(500)
    mockStudent = {
      ...mockStudent,
      admission_status: "expired",
      is_admitted: false,
      offer_expiry_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    }
    return { ...mockStudent }
  },

  async devResetAll(): Promise<AdmissionStudent> {
    await delay(300)
    mockStudent = {
      id: "std-001",
      name: "Chukwuemeka Okonkwo",
      email: "c.okonkwo@students.unilag.edu.ng",
      department: "Computer Science",
      faculty: "Science",
      application_payment_status: "unpaid",
      application_status: "not_started",
      admission_status: "pending",
      acceptance_payment_status: "unpaid",
      tuition_payment_status: "unpaid",
      tuition_amount_paid: 0,
      has_applied: false,
      is_admitted: false,
      session: "2025/2026",
      offer_expiry_date: null,
      has_selected_program: false,
      program_id: null,
      program_name: null,
      entry_mode: null,
      study_mode: null,
      start_term: null,
    }
    return { ...mockStudent }
  },
}

export const admissionKeys = {
  all: ["admission"] as const,
  fees: () => [...admissionKeys.all, "fees"] as const,
  student: () => [...admissionKeys.all, "student"] as const,
  verifyAppPayment: (reference: string) =>
    [...admissionKeys.all, "verify-app", reference] as const,
  verifyAccPayment: (reference: string) =>
    [...admissionKeys.all, "verify-acc", reference] as const,
  verifyTuiPayment: (reference: string) =>
    [...admissionKeys.all, "verify-tui", reference] as const,
}

export const admissionQueryOptions = {
  fees: () =>
    createApiQueryOptions({
      queryKey: admissionKeys.fees(),
      queryFn: admissionService.fetchFees,
    }),

  student: () =>
    createApiQueryOptions({
      queryKey: admissionKeys.student(),
      queryFn: admissionService.fetchStudentAdmission,
    }),

  verifyApplicationPayment: (reference: string) =>
    createApiQueryOptions({
      queryKey: admissionKeys.verifyAppPayment(reference),
      queryFn: () => admissionService.verifyApplicationPayment(reference),
    }),

  verifyAcceptanceFeePayment: (reference: string) =>
    createApiQueryOptions({
      queryKey: admissionKeys.verifyAccPayment(reference),
      queryFn: () => admissionService.verifyAcceptanceFeePayment(reference),
    }),

  verifyTuitionPayment: (reference: string) =>
    createApiQueryOptions({
      queryKey: admissionKeys.verifyTuiPayment(reference),
      queryFn: () => admissionService.verifyTuitionPayment(reference),
    }),
}

export const admissionMutationOptions = {
  submitProgramChoice: () =>
    createApiMutationOptions<
      AdmissionStudent,
      {
        programId: number
        entryMode: EntryMode
        studyMode: StudyMode
        startTerm: string
      }
    >({
      mutationKey: [...admissionKeys.all, "program-choice"],
      mutationFn: (payload) => admissionService.submitProgramChoice(payload),
    }),

  initiateApplicationPayment: () =>
    createApiMutationOptions<PaymentInitiationResponse, void>({
      mutationKey: [
        ...admissionKeys.all,
        "payments",
        "application",
        "initiate",
      ],
      mutationFn: () => admissionService.initiateApplicationPayment(),
    }),

  initiateAcceptanceFeePayment: () =>
    createApiMutationOptions<PaymentInitiationResponse, void>({
      mutationKey: [...admissionKeys.all, "payments", "acceptance", "initiate"],
      mutationFn: () => admissionService.initiateAcceptanceFeePayment(),
    }),

  initiateTuitionPayment: () =>
    createApiMutationOptions<PaymentInitiationResponse, number>({
      mutationKey: [...admissionKeys.all, "payments", "tuition", "initiate"],
      mutationFn: admissionService.initiateTuitionPayment,
    }),

  simulateProgramChosen: () =>
    createApiMutationOptions<
      AdmissionStudent,
      {
        programId: number
        programName: string
        entryMode: EntryMode
        studyMode: StudyMode
        startTerm: string
      }
    >({
      mutationKey: [...admissionKeys.all, "dev", "program-chosen"],
      mutationFn: (payload) =>
        admissionService.devSimulateProgramChosen(payload),
    }),

  simulateAppPaymentPaid: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "app-paid"],
      mutationFn: () => admissionService.devSimulateAppPaymentPaid(),
    }),

  simulateApplied: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "applied"],
      mutationFn: () => admissionService.devSimulateApplied(),
    }),

  simulateOffered: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "offered"],
      mutationFn: () => admissionService.devSimulateAdmissionOffered(),
    }),

  simulateAccepted: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "accepted"],
      mutationFn: () => admissionService.devSimulateAdmissionAccepted(),
    }),

  simulateDeclined: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "declined"],
      mutationFn: () => admissionService.devSimulateDeclined(),
    }),

  simulateExpired: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "expired"],
      mutationFn: () => admissionService.devSimulateExpired(),
    }),

  acceptAdmission: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "accept"],
      mutationFn: () => admissionService.acceptAdmission(),
    }),

  declineAdmission: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "decline"],
      mutationFn: () => admissionService.declineAdmission(),
    }),

  simulateTuitionPaid: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "tuition-paid"],
      mutationFn: () => admissionService.devSimulateTuitionPaid(),
    }),

  resetAll: () =>
    createApiMutationOptions<AdmissionStudent, void>({
      mutationKey: [...admissionKeys.all, "dev", "reset"],
      mutationFn: () => admissionService.devResetAll(),
    }),
}
