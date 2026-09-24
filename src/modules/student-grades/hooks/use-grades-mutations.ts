"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { gradesService } from "../services/grades.service"
import { gradesKeys } from "./query-keys"

// Per-grade create/update/bulk/submit/approve/reject hooks were removed
// (2026-09-24): tutors grade only in Moodle, and the workflow is now
// sheet-level — see use-results-mutations.ts. Only the manual CGPA
// recalculation remains here.

export function useCalculateCgpa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      semesterId,
    }: {
      studentId: number
      semesterId: number
    }) => gradesService.calculateCgpa(studentId, semesterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: gradesKeys.all }),
  })
}
