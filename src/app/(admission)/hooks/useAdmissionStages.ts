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
  const effective = useQuery({
    ...admissionStepsQueryOptions.effective(
      "PROCESS",
      student.data?.program_id
    ),
    enabled: !!student.data?.program_id,
    retry: false,
  })

  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set())
  useEffect(() => {
    setAcknowledged(readLocalAcknowledgements(userId))
  }, [userId])

  // Major Program Choice — sandbox/dynamic-admission/, no live endpoint yet
  // (BACKEND_DEVIATIONS A16). `GET /admission/student` never returns it, so
  // the local fallback value (and, for display, the major program's name)
  // is merged on before composing — same local-fallback treatment as
  // content acknowledgements above.
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

  const source: StagesSource = backend.data ? "backend" : "fallback"

  const studentWithMajorProgram: AdmissionStudent | undefined = useMemo(() => {
    if (!student.data) return undefined
    const majorProgramId = student.data.major_program_id ?? localMajorProgramId
    return {
      ...student.data,
      major_program_id: majorProgramId,
      major_program_name:
        student.data.major_program_name ??
        majorPrograms.data?.data.find((mp) => mp.id === majorProgramId)?.name ??
        null,
    }
  }, [student.data, localMajorProgramId, majorPrograms.data])

  const payload = useMemo(() => {
    if (backend.data) return backend.data
    if (!studentWithMajorProgram) return null
    const steps = effective.data?.length
      ? effective.data
      : (config.data?.processSteps ?? []).filter(
          (s) => (s.enabled || s.required) && !s.programId && !s.programCategory
        )
    return composeFallbackStages(steps, studentWithMajorProgram, acknowledged)
  }, [
    backend.data,
    studentWithMajorProgram,
    effective.data,
    config.data,
    acknowledged,
  ])

  const stages: ResolvedStage[] = payload?.stages ?? []
  const currentStage =
    stages.find((s) => s.key === payload?.currentStageKey) ?? null

  const acknowledgeMutation = useMutation(
    admissionMutationOptions.acknowledgeStage()
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

  // No live endpoint yet either way (A16) — always the local fallback for
  // now, same as a CONTENT stage's acknowledgement above. Swaps to a real
  // mutation call here, gated the same way acknowledge() is, once one ships.
  const chooseMajorProgram = useCallback(
    async (majorProgramId: number) => {
      writeLocalMajorProgramChoice(userId, majorProgramId)
      setLocalMajorProgramId(majorProgramId)
    },
    [userId]
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
    uploadDocument,
    removeDocument,
    isChangingDocuments: uploadMutation.isPending || removeMutation.isPending,
    initiatePayment,
    isInitiatingPayment: paymentMutation.isPending,
  }
}
