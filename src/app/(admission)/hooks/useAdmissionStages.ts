"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { admissionStepsQueryOptions } from "@/services/admissionStepsApi"
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
  writeLocalAcknowledgement,
} from "../lib/admission-stages"
import type { PaymentInitiationResponse } from "../types/admission"
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

  const source: StagesSource = backend.data ? "backend" : "fallback"

  const payload = useMemo(() => {
    if (backend.data) return backend.data
    if (!student.data) return null
    const steps = effective.data?.length
      ? effective.data
      : (config.data?.processSteps ?? []).filter(
          (s) => (s.enabled || s.required) && !s.programId && !s.programCategory
        )
    return composeFallbackStages(steps, student.data, acknowledged)
  }, [backend.data, student.data, effective.data, config.data, acknowledged])

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
    student: student.data,
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
    uploadDocument,
    removeDocument,
    isChangingDocuments: uploadMutation.isPending || removeMutation.isPending,
    initiatePayment,
    isInitiatingPayment: paymentMutation.isPending,
  }
}
