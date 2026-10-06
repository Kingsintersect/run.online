"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { applicationReviewKeys } from "@/services/applicationReviewApi"
import { admissionOfferKeys } from "@/services/admissionOfferApi"
import { usersKeys } from "@/services/usersApi"
import { applicantPromotionApi } from "../services/applicant-promotion.service"
import { useApplicantPromotionUiStore } from "../store/applicant-promotion-ui.store"
import { isEndpointMissing } from "@/modules/student-grades/lib/results-errors"
import { applicantPromotionKeys } from "./query-keys"
import type { PromotionResult } from "../types"

/**
 * Manually promotes an accepted applicant into an active Student
 * (POST /users/students/promote/:userId). `userId` is the applicant's USER
 * id — the application's `applicant_id` — not a student id.
 *
 * Never retried: a write like this must not be replayed, and a missing route
 * flips the module's `endpointMissing` flag so the action disables itself.
 */
export function usePromoteApplicantToStudent(userId: number) {
  const qc = useQueryClient()
  const markEndpointMissing = useApplicantPromotionUiStore(
    (s) => s.markEndpointMissing
  )

  return useMutation<PromotionResult, Error, void>({
    mutationKey: applicantPromotionKeys.promote(userId),
    mutationFn: () => applicantPromotionApi.promote({ userId }),
    retry: false,
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: applicationReviewKeys.all }),
        qc.invalidateQueries({ queryKey: admissionOfferKeys.all }),
        // The user's role changes (applicant → student) and a Student row
        // now exists, so every users/students list is stale.
        qc.invalidateQueries({ queryKey: usersKeys.students.all }),
        qc.invalidateQueries({ queryKey: usersKeys.all }),
      ]),
    onError: (error) => {
      if (isEndpointMissing(error)) markEndpointMissing()
    },
  })
}
