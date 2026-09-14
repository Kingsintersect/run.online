/* ------------------------------------------------------------------ */
/*  Frontend composition of an applicant's stages — used only until     */
/*  GET /admission/me/stages ships (sandbox/dynamic-admission/           */
/*  API_CONTRACTS.md §4.1). Status comes from today's                    */
/*  GET /admission/student flags; stages the frontend can't track yet    */
/*  are shown but never block the applicant.                             */
/* ------------------------------------------------------------------ */

import { typedStageConfigForStep } from "@/lib/admission-stage-config"
import type {
  AdmissionFeeCategory,
  StageConfig,
  StageType,
} from "@/types/admissionConfig"
import type { AdmissionStudent } from "../types/admission"
import type {
  AdmissionStagesPayload,
  ResolvedStage,
  StageBlockedReason,
  StageStatus,
} from "../types/admission-stages"

export interface StageSourceStep {
  id: number
  key: string
  label: string
  description: string
  icon: string
  order: number
  type?: StageType | null
  config?: StageConfig | null
}

const done = (flag: boolean | null | undefined): StageStatus =>
  flag === true ? "COMPLETED" : "NOT_STARTED"

/** Payment status for the fee categories the student aggregate reports, or null when it can't be tracked yet. */
function paymentStatus(
  category: AdmissionFeeCategory,
  student: AdmissionStudent
): StageStatus | null {
  const status =
    category === "APPLICATION"
      ? student.application_payment_status
      : category === "ACCEPTANCE"
        ? student.acceptance_payment_status
        : category === "TUITION"
          ? student.tuition_payment_status
          : null
  if (status === null) return null
  if (status === "paid") return "COMPLETED"
  return status === "pending" || status === "partial"
    ? "IN_PROGRESS"
    : "NOT_STARTED"
}

const BLOCKED_BY_OFFER_STATUS: Partial<
  Record<AdmissionStudent["admission_status"], StageBlockedReason>
> = {
  rejected: "APPLICATION_REJECTED",
  declined: "OFFER_DECLINED",
  expired: "OFFER_EXPIRED",
}

export function composeFallbackStages(
  steps: StageSourceStep[],
  student: AdmissionStudent,
  acknowledged: Set<string>
): AdmissionStagesPayload {
  const stages: ResolvedStage[] = []

  for (const step of [...steps].sort((a, b) => a.order - b.order)) {
    const typed = typedStageConfigForStep(step)
    // A stage without a type has nothing to render.
    if (!typed) continue
    const base = {
      id: step.id,
      key: step.key,
      label: step.label,
      description: step.description,
      icon: step.icon,
      order: step.order,
      completedAt: null,
    }

    switch (typed.type) {
      case "PROGRAM_CHOICE":
        stages.push({
          ...base,
          type: "PROGRAM_CHOICE",
          config: typed.config,
          status: done(student.has_selected_program),
          state: {
            programId: student.program_id,
            programName: student.program_name,
            entryMode: student.entry_mode,
            studyMode: student.study_mode,
            startTerm: student.start_term,
          },
        })
        break
      case "PAYMENT": {
        const status = paymentStatus(typed.config.feeCategory, student)
        stages.push({
          ...base,
          type: "PAYMENT",
          config: typed.config,
          status: status ?? "NOT_STARTED",
          awaitingBackend: status === null,
          state: {
            amountPaid:
              typed.config.feeCategory === "TUITION"
                ? student.tuition_amount_paid
                : null,
          },
        })
        break
      }
      case "FORM":
        stages.push({
          ...base,
          type: "FORM",
          config: typed.config,
          status: done(student.has_applied),
          state: {},
        })
        break
      case "DECISION": {
        const blockedReason =
          BLOCKED_BY_OFFER_STATUS[student.admission_status] ?? null
        stages.push({
          ...base,
          type: "DECISION",
          config: typed.config,
          blockedReason,
          status: blockedReason
            ? "BLOCKED"
            : student.admission_status === "accepted"
              ? "COMPLETED"
              : student.admission_status === "offered"
                ? "IN_PROGRESS"
                : "NOT_STARTED",
          state: {
            applicationStatus: student.application_status,
            offerStatus: student.admission_status,
            offerExpiryDate: student.offer_expiry_date,
          },
        })
        break
      }
      case "CONTENT":
        stages.push({
          ...base,
          type: "CONTENT",
          config: typed.config,
          status: acknowledged.has(step.key) ? "COMPLETED" : "NOT_STARTED",
          state: { acknowledgedAt: null },
        })
        break
      case "DOCUMENT_UPLOAD":
        stages.push({
          ...base,
          type: "DOCUMENT_UPLOAD",
          config: typed.config,
          status: "NOT_STARTED",
          awaitingBackend: true,
          state: {
            documents: typed.config.documents.map((doc) => ({
              key: doc.key,
              documentId: null,
              fileName: null,
            })),
          },
        })
        break
      case "COMPLETE":
        stages.push({
          ...base,
          type: "COMPLETE",
          config: typed.config,
          status: "NOT_STARTED",
          state: {},
        })
        break
    }
  }

  const current =
    stages.find(
      (s) =>
        s.type !== "COMPLETE" && s.status !== "COMPLETED" && !s.awaitingBackend
    ) ??
    stages.find((s) => s.type === "COMPLETE") ??
    stages[stages.length - 1]

  return {
    currentStageKey: current?.key ?? "",
    stages: stages.map((s) =>
      s.type === "COMPLETE" && s.key === current?.key
        ? { ...s, status: "COMPLETED" }
        : s
    ),
  }
}

// ── Content acknowledgements, per user, until the backend stores them ──

const ackStorageKey = (userId: string) => `admission_stage_ack_${userId}`

export function readLocalAcknowledgements(
  userId: string | null | undefined
): Set<string> {
  if (!userId || typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(ackStorageKey(userId))
    const parsed: string[] = raw ? JSON.parse(raw) : []
    return new Set(parsed.filter((key) => typeof key === "string"))
  } catch {
    return new Set()
  }
}

export function writeLocalAcknowledgement(
  userId: string | null | undefined,
  stageKey: string
) {
  if (!userId || typeof window === "undefined") return
  const next = readLocalAcknowledgements(userId)
  next.add(stageKey)
  try {
    localStorage.setItem(ackStorageKey(userId), JSON.stringify([...next]))
  } catch {
    // Storage full or blocked — the acknowledgement just won't persist across reloads.
  }
}
