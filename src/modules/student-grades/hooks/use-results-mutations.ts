"use client"

// Mutation hooks for the Results-from-Moodle contract (C7). Nothing here is
// optimistic — adjustments, transitions, mappings and publishing only change
// the UI after the server confirms. Each invalidates the precise key slices
// it affects, via the `resultsKeys` factory. Errors are ApiClientErrors; use
// `toResultsApiError()` to read `{code, message, fieldErrors, notAvailable}`.

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { resultsApi } from "../services/results.service"
import { gradesKeys, resultsKeys } from "./query-keys"
import type {
  AdjustmentCreateBody,
  ApproveSheetBody,
  BatchApproveBody,
  BatchRejectBody,
  GradeScaleForm,
  GradingSchemeForm,
  MapGradeItemBody,
  PublishRequest,
  PullRequest,
  RejectSheetBody,
  ReopenSheetBody,
  ResultPolicyForm,
  RevertBody,
  SingleAdjustBody,
} from "../types"

function useInvalidateSheet(offeringId: number) {
  const qc = useQueryClient()
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: resultsKeys.sheet(offeringId) }),
      qc.invalidateQueries({ queryKey: resultsKeys.adjustments(offeringId) }),
      qc.invalidateQueries({ queryKey: resultsKeys.gradeItems(offeringId) }),
      qc.invalidateQueries({ queryKey: resultsKeys.sheetsAll() }),
    ])
  }
}

// ─── Moodle pull ──────────────────────────────────────────────────────────────

export function useStartPull() {
  return useMutation({
    mutationFn: (body: PullRequest) => resultsApi.startPull(body),
  })
}

// ─── Item mapping ─────────────────────────────────────────────────────────────

export function useMapGradeItem(offeringId: number) {
  const invalidate = useInvalidateSheet(offeringId)
  return useMutation({
    mutationFn: (v: { moodleGradeItemId: number; body: MapGradeItemBody }) =>
      resultsApi.mapGradeItem(offeringId, v.moodleGradeItemId, v.body),
    onSuccess: invalidate,
  })
}

// ─── Sheet workflow ───────────────────────────────────────────────────────────

function useSheetTransition<V>(
  offeringId: number,
  call: (vars: V) => Promise<void>
) {
  const qc = useQueryClient()
  const invalidate = useInvalidateSheet(offeringId)
  return useMutation({
    mutationFn: call,
    onSuccess: async () => {
      await invalidate()
      await qc.invalidateQueries({ queryKey: resultsKeys.publishPreviewAll() })
    },
  })
}

export function useSubmitSheet(offeringId: number) {
  return useSheetTransition<void>(offeringId, () =>
    resultsApi.submitSheet(offeringId)
  )
}

export function useApproveSheet(offeringId: number) {
  return useSheetTransition<ApproveSheetBody>(offeringId, (body) =>
    resultsApi.approveSheet(offeringId, body)
  )
}

export function useRejectSheet(offeringId: number) {
  return useSheetTransition<RejectSheetBody>(offeringId, (body) =>
    resultsApi.rejectSheet(offeringId, body)
  )
}

export function useReopenSheet(offeringId: number) {
  return useSheetTransition<ReopenSheetBody>(offeringId, (body) =>
    resultsApi.reopenSheet(offeringId, body)
  )
}

// ─── Adjustments ──────────────────────────────────────────────────────────────

// A preview writes nothing, so it invalidates nothing.
export function usePreviewAdjustment(offeringId: number) {
  return useMutation({
    mutationFn: (body: AdjustmentCreateBody) =>
      resultsApi.previewAdjustment(offeringId, body),
  })
}

export function useCreateAdjustment(offeringId: number) {
  const qc = useQueryClient()
  const invalidate = useInvalidateSheet(offeringId)
  return useMutation({
    mutationFn: (body: AdjustmentCreateBody) =>
      resultsApi.createAdjustment(offeringId, body),
    onSuccess: async () => {
      await invalidate()
      await qc.invalidateQueries({
        queryKey: resultsKeys.adjustmentQueueAll(),
      })
    },
  })
}

export function useAdjustGrade(offeringId: number) {
  const invalidate = useInvalidateSheet(offeringId)
  return useMutation({
    mutationFn: (v: { gradeId: number; body: SingleAdjustBody }) =>
      resultsApi.adjustGrade(v.gradeId, v.body),
    onSuccess: invalidate,
  })
}

export function useRevertBatch(offeringId: number) {
  const invalidate = useInvalidateSheet(offeringId)
  return useMutation({
    mutationFn: (v: { batchId: number; body: RevertBody }) =>
      resultsApi.revertBatch(v.batchId, v.body),
    onSuccess: invalidate,
  })
}

// Approvals queue: the batch's offering is passed along so its sheet
// refreshes too (an approved batch changes the sheet's scores).
export function useDecideBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      v:
        | {
            decision: "approve"
            batchId: number
            offeringId: number
            body: BatchApproveBody
          }
        | {
            decision: "reject"
            batchId: number
            offeringId: number
            body: BatchRejectBody
          }
    ) =>
      v.decision === "approve"
        ? resultsApi.approveBatch(v.batchId, v.body)
        : resultsApi.rejectBatch(v.batchId, v.body),
    onSuccess: async (_, v) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: resultsKeys.adjustmentQueueAll() }),
        qc.invalidateQueries({ queryKey: resultsKeys.sheet(v.offeringId) }),
        qc.invalidateQueries({
          queryKey: resultsKeys.adjustments(v.offeringId),
        }),
        qc.invalidateQueries({ queryKey: resultsKeys.sheetsAll() }),
      ])
    },
  })
}

// ─── Publishing ───────────────────────────────────────────────────────────────

// Publishing changes what students, analytics, CGPA and every sheet see, so
// it invalidates both whole namespaces.
export function usePublishResults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { semesterId: number; body: PublishRequest }) =>
      resultsApi.publish(v.semesterId, v.body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: resultsKeys.all }),
        qc.invalidateQueries({ queryKey: gradesKeys.all }),
      ])
    },
  })
}

// ─── Configuration ────────────────────────────────────────────────────────────

function useInvalidateSchemes() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: resultsKeys.schemesAll() })
}

export function useCreateScheme() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (body: GradingSchemeForm) => resultsApi.createScheme(body),
    onSuccess: invalidate,
  })
}

export function useUpdateScheme() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (v: { id: number; body: GradingSchemeForm }) =>
      resultsApi.updateScheme(v.id, v.body),
    onSuccess: invalidate,
  })
}

export function useDeleteScheme() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (id: number) => resultsApi.deleteScheme(id),
    onSuccess: invalidate,
  })
}

export function useSaveSchemeScale() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (v: {
      schemeId: number
      scaleId: number | null
      body: GradeScaleForm
    }) =>
      v.scaleId == null
        ? resultsApi.createSchemeScale(v.schemeId, v.body)
        : resultsApi.updateSchemeScale(v.schemeId, v.scaleId, v.body),
    onSuccess: invalidate,
  })
}

export function useDeleteSchemeScale() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (v: { schemeId: number; scaleId: number }) =>
      resultsApi.deleteSchemeScale(v.schemeId, v.scaleId),
    onSuccess: invalidate,
  })
}

export function useSetProgramScheme() {
  const invalidate = useInvalidateSchemes()
  return useMutation({
    mutationFn: (v: { programId: number; gradingSchemeId: number | null }) =>
      resultsApi.setProgramScheme(v.programId, v.gradingSchemeId),
    onSuccess: invalidate,
  })
}

export function useUpdateResultPolicy(majorProgramId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ResultPolicyForm) =>
      resultsApi.updatePolicy(majorProgramId, body),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: resultsKeys.policy(majorProgramId) }),
  })
}
