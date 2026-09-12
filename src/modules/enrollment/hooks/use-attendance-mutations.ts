"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  enrollmentMutationOptions,
  enrollmentKeys,
} from "../services/enrollment.service"

export function useRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.recordAttendance(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...enrollmentKeys.all, "attendance"] }),
  })
}

export function useBulkRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.bulkRecordAttendance(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...enrollmentKeys.all, "attendance"] }),
  })
}

export function useUpdateAttendance() {
  const qc = useQueryClient()
  return useMutation({
    ...enrollmentMutationOptions.updateAttendance(),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...enrollmentKeys.all, "attendance"] }),
  })
}
