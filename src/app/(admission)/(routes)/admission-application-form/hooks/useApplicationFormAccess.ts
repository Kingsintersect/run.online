"use client"

import { useAdmissionStages } from "../../../hooks/useAdmissionStages"
import type { AdmissionStudent } from "../../../types/admission"
import type { ResolvedStage } from "../../../types/admission-stages"

/**
 * Whether the applicant may open the editable application form right now.
 *
 * Found 2026-10-05 in a live browser test: /admission-application-form
 * opened, and could be filled in, with the application fee unpaid — the
 * page never checked the applicant's admission stage at all. It now
 * follows the same stage model /process-admission renders from
 * (useAdmissionStages: GET /admission/me/stages when live, else the
 * frontend composition from the step registry + GET /admission/student
 * flags when that 404s), so both pages always agree on where the
 * applicant is.
 *
 * - "open": the FORM stage is the applicant's current stage.
 * - "fee-unpaid": an APPLICATION fee stage before FORM isn't completed.
 * - "earlier-stage": some other earlier stage is still current.
 * - "submitted": the FORM stage is already completed. Editing a submitted
 *   application isn't supported anywhere (submit is a one-shot POST and
 *   the draft is cleared afterwards), so the form doesn't reopen.
 * - "unavailable": the applicant's own admission record couldn't load,
 *   so there's no honest way to tell either way.
 *
 * If the process has no FORM stage (or its configuration couldn't load,
 * or the current stage can't be placed), this falls back to the raw
 * student flags: `has_applied` and `application_payment_status === "paid"`.
 */
export type ApplicationFormAccess =
  | { status: "loading" }
  | { status: "open" }
  | { status: "fee-unpaid" }
  | { status: "earlier-stage"; stageLabel: string }
  | { status: "submitted" }
  | { status: "unavailable" }

/** Raw student-flag fallback, for when the stage list can't place FORM. */
function accessFromStudentFlags(
  student: AdmissionStudent
): ApplicationFormAccess {
  if (student.has_applied) return { status: "submitted" }
  if (student.application_payment_status !== "paid")
    return { status: "fee-unpaid" }
  return { status: "open" }
}

function resolveAccess(
  stages: ResolvedStage[],
  currentStage: ResolvedStage | null,
  student: AdmissionStudent | undefined,
  isLoading: boolean
): ApplicationFormAccess {
  if (isLoading) return { status: "loading" }
  if (!student) return { status: "unavailable" }

  const formIndex = stages.findIndex((s) => s.type === "FORM")
  if (formIndex === -1) return accessFromStudentFlags(student)

  if (stages[formIndex].status === "COMPLETED") return { status: "submitted" }

  const currentIndex = currentStage
    ? stages.findIndex((s) => s.key === currentStage.key)
    : -1
  if (currentIndex === -1) return accessFromStudentFlags(student)
  if (currentIndex >= formIndex) return { status: "open" }

  const unpaidApplicationFee = stages
    .slice(0, formIndex)
    .some(
      (s) =>
        s.type === "PAYMENT" &&
        s.config.feeCategory === "APPLICATION" &&
        s.status !== "COMPLETED"
    )
  if (unpaidApplicationFee) return { status: "fee-unpaid" }

  return { status: "earlier-stage", stageLabel: stages[currentIndex].label }
}

export function useApplicationFormAccess(): {
  access: ApplicationFormAccess
  refresh: () => Promise<void>
} {
  const { stages, currentStage, student, isLoading, refresh } =
    useAdmissionStages()
  return {
    access: resolveAccess(stages, currentStage, student, isLoading),
    refresh,
  }
}
