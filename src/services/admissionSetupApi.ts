/* ------------------------------------------------------------------ */
/*  Admission Cycle / Requirement — API Service                        */
/*                                                                     */
/*  Real backend contract per                                         */
/*  sandbox/admission/missing_admission_cycle_apis.readme.md           */
/*  (MISSING_BACKEND_APIS.md §2.1) — now shipped by the backend team,  */
/*  still not documented in a bruno collection. The "Admissions        */
/*  Management" screen calls these endpoints for real.                 */
/*                                                                     */
/*  The backend uses camelCase field names and numeric ids throughout  */
/*  (per the doc's schema); this module's existing frontend types stay */
/*  snake_case with an `AdmissionCycleStatus` enum of "DRAFT"|"OPEN"|   */
/*  "CLOSED" (matching the doc's proposed enum) — every function below */
/*  maps between the two so no consuming component needs to change.    */
/*  The response envelope (`{data: ...}` for both single objects and   */
/*  lists) isn't spelled out in the doc, only the flat object shape —  */
/*  assumed wrapped here to match every other module's convention in   */
/*  this backend; adjust the unwrap below if a live check disagrees.   */
/* ------------------------------------------------------------------ */

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  AdmissionCycle,
  AdmissionCycleStatus,
  AdmissionRequirement,
  CreateAdmissionCyclePayload,
  CreateAdmissionRequirementPayload,
  UpdateAdmissionCyclePayload,
} from "@/types/school"

const AUTH = { access_token: true } as const

// ── wire shapes (camelCase, as documented) ──

interface WireAdmissionCycle {
  id: number
  sessionId: number
  status: AdmissionCycleStatus
  applicationStartDate: string
  applicationEndDate: string | null
  lateApplicationAllowed: boolean
  lateApplicationFee: number | string | null
  maxApplications: number
  requireDocuments: boolean
  requiredDocuments: string[] | null
  notificationEmail: string | null
  instructions: string | null
  createdAt: string
  updatedAt: string
}

interface WireAdmissionCycleRequirement {
  id: number
  admissionCycleId: number
  programId: number | null
  minAge: number
  maxAge: number
  minCredits: number
  requiredSubjects: string[] | null
  description: string | null
  createdAt: string
}

const mapCycle = (c: WireAdmissionCycle): AdmissionCycle => ({
  id: c.id,
  academic_session_id: c.sessionId,
  status: c.status,
  application_start_date: c.applicationStartDate,
  application_end_date: c.applicationEndDate ?? "",
  late_application_allowed: c.lateApplicationAllowed,
  late_application_fee:
    c.lateApplicationFee != null ? Number(c.lateApplicationFee) : 0,
  max_applications: c.maxApplications,
  require_documents: c.requireDocuments,
  required_documents: c.requiredDocuments ?? [],
  notification_email: c.notificationEmail ?? "",
  instructions: c.instructions ?? "",
  created_at: c.createdAt,
  updated_at: c.updatedAt,
})

const mapRequirement = (
  r: WireAdmissionCycleRequirement
): AdmissionRequirement => ({
  id: r.id,
  admission_cycle_id: r.admissionCycleId,
  program_id: r.programId != null ? String(r.programId) : "",
  min_age: r.minAge,
  max_age: r.maxAge,
  min_credits: r.minCredits,
  required_subjects: r.requiredSubjects ?? [],
  description: r.description ?? "",
})

export const admissionSetupApi = {
  listCyclesBySession: async (
    sessionId: number
  ): Promise<{ data: AdmissionCycle[] }> => {
    const res = await apiClient.get<{ data: WireAdmissionCycle[] }>(
      "/admissions/cycles",
      { ...AUTH, params: { sessionId } }
    )
    return { data: res.data.map(mapCycle) }
  },

  getCycleById: async (id: number): Promise<{ data: AdmissionCycle }> => {
    const res = await apiClient.get<{ data: WireAdmissionCycle }>(
      `/admissions/cycles/${id}`,
      AUTH
    )
    return { data: mapCycle(res.data) }
  },

  createCycle: async (
    payload: CreateAdmissionCyclePayload
  ): Promise<{ data: AdmissionCycle }> => {
    const res = await apiClient.post<{ data: WireAdmissionCycle }>(
      "/admissions/cycles",
      {
        sessionId: payload.academic_session_id,
        applicationStartDate: payload.application_start_date,
        applicationEndDate: payload.application_end_date || null,
        lateApplicationAllowed: payload.late_application_allowed,
        lateApplicationFee: payload.late_application_allowed
          ? payload.late_application_fee
          : undefined,
        maxApplications: payload.max_applications,
        requireDocuments: payload.require_documents,
        requiredDocuments: payload.require_documents
          ? payload.required_documents
          : undefined,
        notificationEmail: payload.notification_email || undefined,
        instructions: payload.instructions || undefined,
      },
      AUTH
    )
    return { data: mapCycle(res.data) }
  },

  updateCycle: async (
    id: number,
    payload: UpdateAdmissionCyclePayload
  ): Promise<{ data: AdmissionCycle }> => {
    const res = await apiClient.patch<{ data: WireAdmissionCycle }>(
      `/admissions/cycles/${id}`,
      {
        applicationStartDate: payload.application_start_date,
        applicationEndDate:
          payload.application_end_date !== undefined
            ? payload.application_end_date || null
            : undefined,
        lateApplicationAllowed: payload.late_application_allowed,
        lateApplicationFee: payload.late_application_allowed
          ? payload.late_application_fee
          : undefined,
        maxApplications: payload.max_applications,
        requireDocuments: payload.require_documents,
        requiredDocuments: payload.require_documents
          ? payload.required_documents
          : undefined,
        notificationEmail: payload.notification_email || undefined,
        instructions: payload.instructions || undefined,
      },
      AUTH
    )
    return { data: mapCycle(res.data) }
  },

  deleteCycle: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/admissions/cycles/${id}`,
      AUTH
    )
  },

  updateCycleStatus: async (
    id: number,
    status: AdmissionCycleStatus
  ): Promise<{ data: AdmissionCycle }> => {
    const res = await apiClient.patch<{ data: WireAdmissionCycle }>(
      `/admissions/cycles/${id}/status`,
      { status },
      AUTH
    )
    return { data: mapCycle(res.data) }
  },

  listRequirementsByCycle: async (
    cycleId: number
  ): Promise<{ data: AdmissionRequirement[] }> => {
    const res = await apiClient.get<{ data: WireAdmissionCycleRequirement[] }>(
      `/admissions/cycles/${cycleId}/requirements`,
      AUTH
    )
    return { data: res.data.map(mapRequirement) }
  },

  createRequirement: async (
    payload: CreateAdmissionRequirementPayload
  ): Promise<{ data: AdmissionRequirement }> => {
    const res = await apiClient.post<{ data: WireAdmissionCycleRequirement }>(
      `/admissions/cycles/${payload.admission_cycle_id}/requirements`,
      {
        programId: payload.program_id ? Number(payload.program_id) : undefined,
        minAge: payload.min_age,
        maxAge: payload.max_age,
        minCredits: payload.min_credits,
        requiredSubjects: payload.required_subjects,
        description: payload.description,
      },
      AUTH
    )
    return { data: mapRequirement(res.data) }
  },

  deleteRequirement: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/admissions/cycles/requirements/${id}`,
      AUTH
    )
  },
}

export const admissionSetupKeys = {
  all: ["admission-setup"] as const,
  cyclesBySession: (sessionId: number) =>
    [...admissionSetupKeys.all, "cycles", sessionId] as const,
  cycleDetail: (id: number) =>
    [...admissionSetupKeys.all, "cycles", id] as const,
  requirementsByCycle: (cycleId: number) =>
    [...admissionSetupKeys.all, "requirements", cycleId] as const,
}

export const admissionSetupQueryOptions = {
  cyclesBySession: (sessionId: number) =>
    createApiQueryOptions({
      queryKey: admissionSetupKeys.cyclesBySession(sessionId),
      queryFn: async () =>
        (await admissionSetupApi.listCyclesBySession(sessionId)).data,
    }),

  cycleDetail: (id: number) =>
    createApiQueryOptions({
      queryKey: admissionSetupKeys.cycleDetail(id),
      queryFn: async () => (await admissionSetupApi.getCycleById(id)).data,
    }),

  requirementsByCycle: (cycleId: number) =>
    createApiQueryOptions({
      queryKey: admissionSetupKeys.requirementsByCycle(cycleId),
      queryFn: async () =>
        (await admissionSetupApi.listRequirementsByCycle(cycleId)).data,
    }),
}

export const admissionSetupMutationOptions = {
  createCycle: () =>
    createApiMutationOptions<
      { data: AdmissionCycle },
      CreateAdmissionCyclePayload
    >({
      mutationKey: [...admissionSetupKeys.all, "cycles", "create"],
      mutationFn: admissionSetupApi.createCycle,
    }),

  updateCycle: () =>
    createApiMutationOptions<
      { data: AdmissionCycle },
      { id: number; payload: UpdateAdmissionCyclePayload }
    >({
      mutationKey: [...admissionSetupKeys.all, "cycles", "update"],
      mutationFn: ({ id, payload }) =>
        admissionSetupApi.updateCycle(id, payload),
    }),

  deleteCycle: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...admissionSetupKeys.all, "cycles", "delete"],
      mutationFn: admissionSetupApi.deleteCycle,
    }),

  updateCycleStatus: () =>
    createApiMutationOptions<
      { data: AdmissionCycle },
      { id: number; status: AdmissionCycleStatus }
    >({
      mutationKey: [...admissionSetupKeys.all, "cycles", "status"],
      mutationFn: ({ id, status }) =>
        admissionSetupApi.updateCycleStatus(id, status),
    }),

  createRequirement: () =>
    createApiMutationOptions<
      { data: AdmissionRequirement },
      CreateAdmissionRequirementPayload
    >({
      mutationKey: [...admissionSetupKeys.all, "requirements", "create"],
      mutationFn: admissionSetupApi.createRequirement,
    }),

  deleteRequirement: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationKey: [...admissionSetupKeys.all, "requirements", "delete"],
      mutationFn: admissionSetupApi.deleteRequirement,
    }),
}
