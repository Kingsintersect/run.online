/* ------------------------------------------------------------------ */
/*  Admission Module — Zustand Store                                   */
/* ------------------------------------------------------------------ */

import { create } from "zustand"
import type {
  AdmissionStudent,
  FeeSchedule,
  AdmissionStep,
} from "../types/admission"
import { AdmissionStep as Step } from "../types/admission"
import { sortByOrder } from "@/lib/admissionConfig"
import type { AdmissionStepDefinition } from "@/types/admissionConfig"

interface AdmissionState {
  student: AdmissionStudent | null
  fees: FeeSchedule | null
  // NOT the source of truth for rendering — `student` and `processSteps`
  // arrive from two independent queries, and whichever one's setter (below)
  // runs first computes this from the OTHER value's state at that instant,
  // which may still be its empty/null default. `process-admission/page.tsx`
  // does not read this field; it derives the step itself via `useMemo` from
  // both queries' live data, which is race-free by construction. Kept here
  // (and still kept up to date) only in case something outside that page
  // ever needs a best-effort synchronous snapshot.
  currentStep: AdmissionStep
  /** The admin's PROCESS step registry rows, filtered to enabled/required and sorted by `order`. */
  processSteps: AdmissionStepDefinition[]

  /* Actions */
  setStudent: (student: AdmissionStudent) => void
  setFees: (fees: FeeSchedule) => void
  setStepConfig: (steps: AdmissionStepDefinition[]) => void
  computeStep: () => void
  reset: () => void
}

/** Whether the applicant has satisfied a given known process step, keyed by its registry `key`. */
const STEP_COMPLETION: Partial<
  Record<AdmissionStep, (student: AdmissionStudent) => boolean>
> = {
  [Step.CHOICE_PROGRAM]: (s) => s.has_selected_program,
  [Step.APPLICATION_PAYMENT]: (s) => s.application_payment_status === "paid",
  [Step.APPLICATION_FORM]: (s) => s.has_applied,
  [Step.ADMISSION_STATUS]: (s) =>
    s.admission_status !== "pending" &&
    s.admission_status !== "rejected" &&
    s.admission_status !== "declined" &&
    s.admission_status !== "expired",
  [Step.ACCEPTANCE_FEE]: (s) => s.acceptance_payment_status === "paid",
  [Step.TUITION_PAYMENT]: (s) => s.tuition_payment_status === "paid",
}

/**
 * Derives the current step by walking the admin-ordered, enabled process
 * steps and returning the key of the first one not yet satisfied. This is
 * the single source of truth for which section to display — order comes
 * entirely from the step registry's `order` field, so admin reordering (or
 * a newly added custom step like "Choice Program") changes real behavior,
 * not just the visual indicator. A step with no known completion check
 * (a genuinely custom key with no matching UI yet) is treated as
 * automatically satisfied so applicants never get stuck on it.
 */
export function deriveStep(
  student: AdmissionStudent | null,
  orderedSteps: AdmissionStepDefinition[]
): AdmissionStep {
  if (!student) {
    return (orderedSteps[0]?.key as AdmissionStep) ?? Step.APPLICATION_PAYMENT
  }

  for (const step of orderedSteps) {
    if (step.key === Step.COMPLETED) continue

    const checkCompletion = STEP_COMPLETION[step.key as AdmissionStep]
    // No registered predicate at all — a genuinely custom key with no
    // matching UI/gating logic yet. Skip it rather than trap the applicant.
    if (!checkCompletion) continue

    // A predicate DOES exist for this step — anything other than a strict
    // `true` means "not done yet". This used to check `=== false`, which
    // silently treated `null`/`undefined` as "satisfied" too. That's the
    // wrong default for a known field like `has_selected_program`: the real
    // backend doesn't return it yet, and depending on exactly how a
    // not-fully-implemented field comes back (omitted vs. explicit `null`),
    // the value here can be `undefined` or `null` rather than a clean
    // `false` — either way it means "not chosen yet", not "safe to skip".
    if (checkCompletion(student) !== true) return step.key as AdmissionStep
  }

  return Step.COMPLETED
}

// `student`/`fees` are server data that already lives in React Query's cache
// (see useAdmissionQueries.ts) — this store just mirrors the latest fetch for
// synchronous access elsewhere (e.g. deriveStep). It must NOT persist to
// localStorage: this flow runs on shared/kiosk-style browsers (a school lab,
// a cybercafé) where one account's admission progress persisting into the
// next person's session — including a fabricated "payment paid" status from
// the dev-only simulate buttons — is a real cross-account data leak, not
// just a stale-cache annoyance.
export const useAdmissionStore = create<AdmissionState>()((set, get) => ({
  student: null,
  fees: null,
  currentStep: Step.APPLICATION_PAYMENT,
  // Empty until the real admin-configured step registry loads (see
  // process-admission/page.tsx's setStepConfig effect) — this store no
  // longer seeds itself from static/dummy step data.
  processSteps: [],

  setStudent: (student) => {
    set({ student })
    // Recompute step whenever student data changes
    set({ currentStep: deriveStep(student, get().processSteps) })
  },

  setFees: (fees) => set({ fees }),

  setStepConfig: (steps) => {
    const orderedSteps = sortByOrder(
      steps.filter((s) => s.enabled || s.required)
    )
    set({ processSteps: orderedSteps })
    set({ currentStep: deriveStep(get().student, orderedSteps) })
  },

  computeStep: () => {
    const { student, processSteps } = get()
    set({ currentStep: deriveStep(student, processSteps) })
  },

  reset: () =>
    set({
      student: null,
      fees: null,
      currentStep: Step.APPLICATION_PAYMENT,
    }),
}))
