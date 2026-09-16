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

/**
 * Client-side stand-in for the server's `GET /admissions/config/steps/
 * effective` resolution, used only when that endpoint hasn't returned
 * anything yet (still loading, erroring, or neither id is known yet).
 *
 * Major-Program Scoping is fully decoupled (BACKEND_DEVIATIONS A23,
 * sandbox/dynamic-admission/SCHEMA_CHANGES.md §2c) — once `majorProgramId`
 * is known, resolution considers *only* that major program's own rows (a
 * `programId`-scoped row under it, else its own `majorProgramId`-scoped
 * rows) — no fallback to the institution default at all. A major program
 * that hasn't adopted a given `key` simply doesn't show that step; nothing
 * substitutes for it.
 *
 * Before `majorProgramId` is known, "All major programs" is a pure catalog
 * (never served directly, per A23) — the *only* thing that can resolve is
 * the one step that decides which major program applies in the first
 * place, `MAJOR_PROGRAM_CHOICE` itself (found in review 2026-09-15: the
 * old code fell back to every default-scoped row here, which — besides
 * being template leakage — could route the applicant's `currentStageKey`
 * straight into a catalog template and skip Major Program Choice
 * entirely if a template happened to sort before it). A deployment that
 * doesn't use major programs at all has no `MAJOR_PROGRAM_CHOICE` row in
 * its registry to begin with, so this degrades to the original pre-A22
 * behavior automatically — every default-scoped row, same as always
 * (`major-program-scoping/README.md` §0's governing rule).
 */
export function resolveClientSideSteps<
  T extends {
    key: string
    order: number
    enabled: boolean
    required: boolean
    programId?: number | null
    majorProgramId?: number | null
  },
>(steps: T[], programId: number | null, majorProgramId: number | null): T[] {
  const active = steps.filter((s) => s.enabled || s.required)
  const byKey = new Map<string, T>()
  const layer = (matches: (s: T) => boolean) => {
    for (const step of active) if (matches(step)) byKey.set(step.key, step)
  }
  if (majorProgramId != null) {
    // Fully decoupled — no institution-default fallback once a major
    // program is known, matching the live A23 resolution rule.
    layer((s) => !s.programId && s.majorProgramId === majorProgramId)
    if (programId != null) layer((s) => s.programId === programId)
  } else {
    const usesMajorPrograms = active.some(
      (s) => s.key === "MAJOR_PROGRAM_CHOICE"
    )
    if (usesMajorPrograms) {
      layer(
        (s) =>
          !s.programId && !s.majorProgramId && s.key === "MAJOR_PROGRAM_CHOICE"
      )
    } else {
      layer((s) => !s.programId && !s.majorProgramId)
    }
    if (programId != null) layer((s) => s.programId === programId)
  }
  return [...byKey.values()].sort((a, b) => a.order - b.order)
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
      case "MAJOR_PROGRAM_CHOICE":
        stages.push({
          ...base,
          type: "MAJOR_PROGRAM_CHOICE",
          config: typed.config,
          status: done(!!student.major_program_id),
          state: {
            majorProgramId: student.major_program_id ?? null,
            majorProgramName: student.major_program_name ?? null,
          },
        })
        break
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

// ── Major program choice, per user, until the backend stores it ──
// sandbox/dynamic-admission/ — no live endpoint yet (BACKEND_DEVIATIONS
// A16); same local-fallback treatment as content acknowledgements above.

const majorProgramChoiceStorageKey = (userId: string) =>
  `admission_major_program_${userId}`

export function readLocalMajorProgramChoice(
  userId: string | null | undefined
): number | null {
  if (!userId || typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(majorProgramChoiceStorageKey(userId))
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeLocalMajorProgramChoice(
  userId: string | null | undefined,
  majorProgramId: number
) {
  if (!userId || typeof window === "undefined") return
  try {
    localStorage.setItem(
      majorProgramChoiceStorageKey(userId),
      String(majorProgramId)
    )
  } catch {
    // Storage full or blocked — the choice just won't persist across reloads.
  }
}
