"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { gradesService } from "../services/grades.service"
import { gradesKeys } from "./query-keys"
import type {
  CreateGradeDto,
  UpdateGradeDto,
  BulkGradeDto,
} from "../types/grades.types"

// Grade actions ripple across the list, transcript, and every analytics
// endpoint at once (a single approve/publish changes counts everywhere) — so
// each mutation invalidates the whole `grades` key namespace rather than a
// narrower slice, still going through the typed factory per CLAUDE.md.

function useInvalidateGrades() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: gradesKeys.all })
}

export function useCreateGrade() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: (dto: CreateGradeDto) => gradesService.createGrade(dto),
    onSuccess: () => invalidate(),
  })
}

export function useUpdateGrade() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateGradeDto }) =>
      gradesService.updateGrade(id, dto),
    onSuccess: () => invalidate(),
  })
}

export function useBulkCreateGrades() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: (dto: BulkGradeDto) => gradesService.bulkCreateGrades(dto),
    onSuccess: () => invalidate(),
  })
}

export function useSubmitGrade() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: (id: number) => gradesService.submitGrade(id),
    onSuccess: () => invalidate(),
  })
}

export function useApproveGrade() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks?: string }) =>
      gradesService.approveGrade(id, remarks),
    onSuccess: () => invalidate(),
  })
}

export function useRejectGrade() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      gradesService.rejectGrade(id, remarks),
    onSuccess: () => invalidate(),
  })
}

export function useCalculateCgpa() {
  const invalidate = useInvalidateGrades()
  return useMutation({
    mutationFn: ({
      studentId,
      semesterId,
    }: {
      studentId: number
      semesterId: number
    }) => gradesService.calculateCgpa(studentId, semesterId),
    onSuccess: () => invalidate(),
  })
}
