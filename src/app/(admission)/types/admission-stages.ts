/* ------------------------------------------------------------------ */
/*  Typed admission stages for one applicant —                         */
/*  sandbox/dynamic-admission/API_CONTRACTS.md §4.1                     */
/* ------------------------------------------------------------------ */

import type { StageConfigByType, StageType } from "@/types/admissionConfig"

export type StageStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"

export type StageBlockedReason =
  | "APPLICATION_REJECTED"
  | "OFFER_DECLINED"
  | "OFFER_EXPIRED"

export interface MajorProgramChoiceStageState {
  majorProgramId?: number | null
  majorProgramName?: string | null
}

export interface ProgramChoiceStageState {
  programId?: number | null
  programName?: string | null
  entryMode?: string | null
  studyMode?: string | null
  startTerm?: string | null
}

export interface PaymentStageState {
  feeTypeId?: number | null
  feeName?: string | null
  currency?: string | null
  amount?: number | null
  amountPaid?: number | null
  balance?: number | null
  invoiceId?: number | null
  minimumPayable?: number | null
}

export interface DecisionStageState {
  applicationStatus?: string | null
  offerStatus?: string | null
  offerExpiryDate?: string | null
  admissionId?: number | null
}

export interface ContentStageState {
  acknowledgedAt: string | null
}

export interface StageDocumentState {
  key: string
  documentId: number | null
  fileName: string | null
}

export interface DocumentUploadStageState {
  documents: StageDocumentState[]
}

export type EmptyStageState = Record<string, never>

export interface StageStateByType {
  MAJOR_PROGRAM_CHOICE: MajorProgramChoiceStageState
  PROGRAM_CHOICE: ProgramChoiceStageState
  PAYMENT: PaymentStageState
  FORM: EmptyStageState
  DECISION: DecisionStageState
  CONTENT: ContentStageState
  DOCUMENT_UPLOAD: DocumentUploadStageState
  COMPLETE: EmptyStageState
}

interface ResolvedStageBase {
  id: number
  key: string
  label: string
  description: string
  /** Lucide icon name. */
  icon: string
  order: number
  status: StageStatus
  completedAt: string | null
  blockedReason?: StageBlockedReason | null
  /**
   * Only set while stages are composed on the frontend (before
   * GET /admission/me/stages ships): this stage can't be completed yet, so it
   * is shown but never blocks the applicant.
   */
  awaitingBackend?: boolean
}

export type ResolvedStage = {
  [K in StageType]: ResolvedStageBase & {
    type: K
    config: StageConfigByType[K]
    state: StageStateByType[K]
  }
}[StageType]

export type ResolvedStageOf<T extends StageType> = Extract<
  ResolvedStage,
  { type: T }
>

export interface AdmissionStagesPayload {
  sessionId?: number | null
  programId?: number | null
  currentStageKey: string
  stages: ResolvedStage[]
}

/** Where the stages came from — the backend, or composed on the frontend meanwhile. */
export type StagesSource = "backend" | "fallback"
