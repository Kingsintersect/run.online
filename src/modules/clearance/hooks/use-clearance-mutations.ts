"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { clearanceService } from "../services/clearance.service"
import { clearanceKeys } from "./query-keys"
import type {
  ApproveClearanceDto,
  CreateClearanceTypeDto,
  RejectClearanceDto,
  RequestClearanceDto,
  UpdateClearanceTypeDto,
} from "../types"

// ── Clearance Types ────────────────────────

export function useCreateClearanceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateClearanceTypeDto) =>
      clearanceService.createType(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: clearanceKeys.types() }),
  })
}

export function useUpdateClearanceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateClearanceTypeDto }) =>
      clearanceService.updateType(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: clearanceKeys.types() }),
  })
}

export function useDeactivateClearanceType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => clearanceService.deactivateType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clearanceKeys.types() }),
  })
}

// ── Student Clearances ─────────────────────

export function useRequestClearance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: RequestClearanceDto) => clearanceService.request(dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: clearanceKeys.all })
      qc.invalidateQueries({
        queryKey: clearanceKeys.byStudent(variables.studentId),
      })
      qc.invalidateQueries({
        queryKey: clearanceKeys.summary(variables.studentId),
      })
    },
  })
}

export function useRequestAllClearances() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => clearanceService.requestAll(studentId),
    onSuccess: (_data, studentId) => {
      qc.invalidateQueries({ queryKey: clearanceKeys.all })
      qc.invalidateQueries({ queryKey: clearanceKeys.byStudent(studentId) })
      qc.invalidateQueries({ queryKey: clearanceKeys.summary(studentId) })
    },
  })
}

export function useApproveClearance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ApproveClearanceDto }) =>
      clearanceService.approve(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: clearanceKeys.all })
      qc.invalidateQueries({ queryKey: clearanceKeys.detail(variables.id) })
    },
  })
}

export function useRejectClearance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: RejectClearanceDto }) =>
      clearanceService.reject(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: clearanceKeys.all })
      qc.invalidateQueries({ queryKey: clearanceKeys.detail(variables.id) })
    },
  })
}
