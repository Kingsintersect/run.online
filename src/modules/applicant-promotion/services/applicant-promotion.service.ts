// ─── Applicant → Student promotion — service ──────────────────────────────
//
// POST /users/students/promote/:userId — StudentController::promote(), Admin
// only (requireRoles(['admin'])). Calls StudentService::
// promoteApplicantToStudent and returns the new Student as a StudentResource.
// Documented only in the QHUB Bruno collection (bruno/user/Students -
// Promote.bru); a RUN deployment may not register the route, which the hook
// layer turns into an "unavailable on this server" state (CLAUDE.md §14).

import apiClient from "@/lib/clients/apiClient"
import {
  PromoteApplicantParamsSchema,
  PromoteApplicantResponseSchema,
} from "../schemas"
import type { PromoteApplicantParams, PromotionResult } from "../types"

const AUTH = { access_token: true } as const

export const applicantPromotionApi = {
  async promote(params: PromoteApplicantParams): Promise<PromotionResult> {
    const { userId } = PromoteApplicantParamsSchema.parse(params)
    const body = await apiClient.post<object>(
      `/users/students/promote/${userId}`,
      undefined,
      AUTH
    )
    // The server has already promoted the applicant by this point, so a
    // response that doesn't match StudentResource must not read as a failure
    // — it only means there's no matric number to show.
    const parsed = PromoteApplicantResponseSchema.safeParse(body)
    if (!parsed.success) return { student: null }
    return {
      student: "data" in parsed.data ? parsed.data.data : parsed.data,
    }
  },
}
