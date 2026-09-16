"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
import { courseStructureQueryOptions } from "@/services/courseStructureApi"
import { useAppStore } from "@/store/appStore"
import {
  admissionKeys,
  admissionMutationOptions,
  admissionQueryOptions,
} from "../services/admissionService"
import { useFees, useStudentAdmission } from "./useAdmissionQueries"
import {
  composeFallbackStages,
  readLocalAcknowledgements,
  readLocalMajorProgramChoice,
  resolveClientSideSteps,
  writeLocalAcknowledgement,
  writeLocalMajorProgramChoice,
} from "../lib/admission-stages"
import type {
  AdmissionStudent,
  PaymentInitiationResponse,
} from "../types/admission"
import type { ResolvedStage, StagesSource } from "../types/admission-stages"

/**
 * The applicant's admission stages (sandbox/dynamic-admission/API_CONTRACTS.md
 * §4). Uses GET /admission/me/stages when it exists; until then composes the
 * same shape from the process step registry and today's student flags.
 */
export function useAdmissionStages() {
  const queryClient = useQueryClient()
  const userId = useAppStore((s) => s.user?.id)
  const fees = useFees()
  const student = useStudentAdmission()
  const backend = useQuery(admissionQueryOptions.stages())
  const config = useQuery(admissionStepsQueryOptions.config())

  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())
  useEffect(() => {
    setAcknowledged(readLocalAcknowledgements(userId))
  }, [userId])

  // Major Program Choice — sandbox/dynamic-admission/, no live endpoint yet
  // (BACKEND_DEVIATIONS A16). `GET /admission/student` never returns it, so
  // the local fallback value (and, for display, the major program's name)
  // is merged on before composing — same local-fallback treatment as
  // content acknowledgements above. Computed ahead of `effective` below
  // since that query needs it as a resolution param the moment it's known —
  // Major Program Choice happens well before Program Choice, so an
  // applicant's major-program-scoped steps must be able to resolve before
  // `program_id` exists at all, not just once it does.
  const [localMajorProgramId, setLocalMajorProgramId] = useState<number | null>(
    null
  )
  useEffect(() => {
    setLocalMajorProgramId(readLocalMajorProgramChoice(userId))
  }, [userId])
  const majorPrograms = useQuery({
    ...courseStructureQueryOptions.majorPrograms.list(),
    retry: false,
  })
  const knownMajorProgramId =
    student.data?.major_program_id ?? localMajorProgramId

  // Major-Program Scoping (BACKEND_DEVIATIONS A22) — `majorProgramId` is
  // sent ahead of the backend recognizing it on this endpoint (harmless
  // no-op today, same build-ahead pattern used everywhere else); enabling
  // on either id, not just `program_id`, is what actually matters here —
  // see the comment above.
  const effective = useQuery({
    ...admissionStepsQueryOptions.effective(
      "PROCESS",
      student.data?.program_id,
      knownMajorProgramId
    ),
    enabled: !!student.data?.program_id || knownMajorProgramId != null,
    retry: false,
  })

  const source: StagesSource = backend.data ? "backend" : "fallback"

  const studentWithMajorProgram: AdmissionStudent | undefined = useMemo(() => {
    if (!student.data) return undefined
    return {
      ...student.data,
      major_program_id: knownMajorProgramId,
      major_program_name:
        student.data.major_program_name ??
        majorPrograms.data?.data.find((mp) => mp.id === knownMajorProgramId)
          ?.name ??
        null,
    }
  }, [student.data, knownMajorProgramId, majorPrograms.data])

  const payload = useMemo(() => {
    if (backend.data) return backend.data
    if (!studentWithMajorProgram) return null
    const steps = effective.data?.length
      ? effective.data
      : resolveClientSideSteps(
          config.data?.processSteps ?? [],
          student.data?.program_id ?? null,
          knownMajorProgramId
        )
    return composeFallbackStages(steps, studentWithMajorProgram, acknowledged)
  }, [
    backend.data,
    studentWithMajorProgram,
    effective.data,
    config.data,
    student.data?.program_id,
    knownMajorProgramId,
    acknowledged,
  ])

  const stages: ResolvedStage[] = payload?.stages ?? []
  const currentStage =
    stages.find((s) => s.key === payload?.currentStageKey) ?? null

  const acknowledgeMutation = useMutation(
    admissionMutationOptions.acknowledgeStage()
  )
  const majorProgramChoiceMutation = useMutation(
    admissionMutationOptions.submitMajorProgramChoice()
  )
  const uploadMutation = useMutation(
    admissionMutationOptions.uploadStageDocuments()
  )
  const removeMutation = useMutation(
    admissionMutationOptions.removeStageDocument()
  )
  const paymentMutation = useMutation(
    admissionMutationOptions.initiateStagePayment()
  )

  const invalidateStages = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: admissionKeys.stages() }),
        queryClient.invalidateQueries({ queryKey: admissionKeys.student() }),
      ]),
    [queryClient]
  )

  const refresh = useCallback(async () => {
    await invalidateStages()
    await student.refetch()
  }, [invalidateStages, student])

  const acknowledge = useCallback(
    async (stageKey: string) => {
      if (source === "backend") {
        await acknowledgeMutation.mutateAsync(stageKey)
        await invalidateStages()
        return
      }
      writeLocalAcknowledgement(userId, stageKey)
      setAcknowledged(readLocalAcknowledgements(userId))
    },
    [source, acknowledgeMutation, invalidateStages, userId]
  )

  // POST /admission/major-program-choice confirmed live 2026-09-15/16 (A16
  // items 2-3) — gated the same way acknowledge() is: once GET /admission/
  // me/stages is answering for real (source === "backend"), the backend
  // has to actually be told about the choice, or its own resolution never
  // marks MAJOR_PROGRAM_CHOICE complete and the applicant stays stuck on
  // this stage forever regardless of what's written locally (the real bug
  // this fixes — found 2026-09-16, screenshot showed exactly this: "Major
  // program saved" toast, but the page never advanced). refresh() (not
  // just invalidateStages()) so student.major_program_id — which the next
  // stage's resolution keys off — is refetched immediately, not on the
  // next natural refetch.
  const chooseMajorProgram = useCallback(
    async (majorProgramId: number) => {
      if (source === "backend") {
        await majorProgramChoiceMutation.mutateAsync({ majorProgramId })
        await refresh()
        return
      }
      writeLocalMajorProgramChoice(userId, majorProgramId)
      setLocalMajorProgramId(majorProgramId)
    },
    [source, majorProgramChoiceMutation, refresh, userId]
  )

  const uploadDocument = useCallback(
    async (stageKey: string, documentKey: string, file: File) => {
      await uploadMutation.mutateAsync({
        key: stageKey,
        documents: { [documentKey]: file },
      })
      await invalidateStages()
    },
    [uploadMutation, invalidateStages]
  )

  const removeDocument = useCallback(
    async (stageKey: string, documentKey: string) => {
      await removeMutation.mutateAsync({ key: stageKey, docKey: documentKey })
      await invalidateStages()
    },
    [removeMutation, invalidateStages]
  )

  const initiatePayment = useCallback(
    (stageKey: string, amount?: number): Promise<PaymentInitiationResponse> =>
      paymentMutation.mutateAsync({ key: stageKey, amount }),
    [paymentMutation]
  )

  const waitingForSteps =
    source === "fallback" && (config.isLoading || effective.isLoading)
  const configError =
    source === "fallback" && config.isError && !effective.data?.length

  return {
    stages,
    currentStage,
    source,
    student: studentWithMajorProgram,
    majorProgramOptions: majorPrograms.data?.data ?? [],
    fees: fees.data,
    isLoading:
      student.isLoading ||
      fees.isLoading ||
      backend.isLoading ||
      waitingForSteps,
    configError,
    configEmpty:
      !student.isLoading &&
      !waitingForSteps &&
      !configError &&
      !!payload &&
      stages.length === 0,
    refresh,
    acknowledge,
    isAcknowledging: acknowledgeMutation.isPending,
    chooseMajorProgram,
    isChoosingMajorProgram: majorProgramChoiceMutation.isPending,
    uploadDocument,
    removeDocument,
    isChangingDocuments: uploadMutation.isPending || removeMutation.isPending,
    initiatePayment,
    isInitiatingPayment: paymentMutation.isPending,
  }
}
