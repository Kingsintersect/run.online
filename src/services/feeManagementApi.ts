import {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import apiClient from "@/lib/clients/apiClient"
import type {
  AcademicSession,
  Semester,
  CreateAcademicSessionPayload,
  UpdateAcademicSessionPayload,
  CreateSemesterPayload,
  ApiListResponse,
  ApiSingleResponse,
} from "@/types/school"

const AUTH = { access_token: true }

// ── Academic Sessions ───────────────────────

// Real backend contract per bruno/academic (the sole source of truth — see
// CLAUDE.md §13). AcademicSession and Semester have NO delete endpoint by
// design — academic_README.md: "retire a session/semester by leaving
// isActive = false, never by deleting the row." No delete() method exists
// here for either resource; don't add one without a matching real endpoint.
export const academicSessionApi = {
  list: async () => {
    return apiClient.get<ApiListResponse<AcademicSession>>(
      "/academic/sessions",
      AUTH
    )
  },

  getById: async (id: number) => {
    return apiClient.get<ApiSingleResponse<AcademicSession>>(
      `/academic/sessions/${id}`,
      AUTH
    )
  },

  create: async (payload: CreateAcademicSessionPayload) => {
    return apiClient.post<
      ApiSingleResponse<AcademicSession>,
      CreateAcademicSessionPayload
    >("/academic/sessions", payload, AUTH)
  },

  update: async (id: number, payload: UpdateAcademicSessionPayload) => {
    return apiClient.patch<
      ApiSingleResponse<AcademicSession>,
      UpdateAcademicSessionPayload
    >(`/academic/sessions/${id}`, payload, AUTH)
  },

  activate: async (id: number) => {
    return apiClient.patch<
      ApiSingleResponse<AcademicSession>,
      Record<string, never>
    >(`/academic/sessions/${id}/activate`, {}, AUTH)
  },
}

// ── Semesters ───────────────────────────────

export const semesterApi = {
  listBySession: async (sessionId: number) => {
    // The backend's SemesterController::index() only recognizes
    // `academicSessionId` — a plain `sessionId` param is silently ignored and
    // the endpoint returns every semester unfiltered (see
    // bruno/academic/Semesters - List.bru's docs block).
    return apiClient.get<ApiListResponse<Semester>>(
      `/academic/semesters?academicSessionId=${sessionId}`,
      AUTH
    )
  },

  create: async (payload: CreateSemesterPayload) => {
    return apiClient.post<ApiSingleResponse<Semester>, CreateSemesterPayload>(
      "/academic/semesters",
      payload,
      AUTH
    )
  },

  update: (id: number, payload: Partial<CreateSemesterPayload>) =>
    apiClient.patch<
      ApiSingleResponse<Semester>,
      Partial<CreateSemesterPayload>
    >(`/academic/semesters/${id}`, payload, AUTH),

  activate: async (id: number) => {
    return apiClient.patch<ApiSingleResponse<Semester>, Record<string, never>>(
      `/academic/semesters/${id}/activate`,
      {},
      AUTH
    )
  },
}

export const feeManagementKeys = {
  all: ["fee-management"] as const,
  sessions: () => [...feeManagementKeys.all, "sessions"] as const,
  sessionDetail: (id: number) =>
    [...feeManagementKeys.all, "sessions", id] as const,
  semestersBySession: (sessionId: number) =>
    [...feeManagementKeys.all, "semesters", sessionId] as const,
}

export const feeManagementQueryOptions = {
  sessions: () =>
    createApiQueryOptions({
      queryKey: feeManagementKeys.sessions(),
      queryFn: async () => (await academicSessionApi.list()).data,
    }),

  sessionDetail: (id: number) =>
    createApiQueryOptions({
      queryKey: feeManagementKeys.sessionDetail(id),
      queryFn: async () => (await academicSessionApi.getById(id)).data,
    }),

  semestersBySession: (sessionId: number) =>
    createApiQueryOptions({
      queryKey: feeManagementKeys.semestersBySession(sessionId),
      queryFn: async () => (await semesterApi.listBySession(sessionId)).data,
    }),
}

export const feeManagementMutationOptions = {
  createSession: () =>
    createApiMutationOptions<
      ApiSingleResponse<AcademicSession>,
      CreateAcademicSessionPayload
    >({
      mutationKey: [...feeManagementKeys.sessions(), "create"],
      mutationFn: academicSessionApi.create,
    }),

  updateSession: () =>
    createApiMutationOptions<
      ApiSingleResponse<AcademicSession>,
      { id: number; payload: UpdateAcademicSessionPayload }
    >({
      mutationKey: [...feeManagementKeys.sessions(), "update"],
      mutationFn: ({ id, payload }) => academicSessionApi.update(id, payload),
    }),

  activateSession: () =>
    createApiMutationOptions<ApiSingleResponse<AcademicSession>, number>({
      mutationKey: [...feeManagementKeys.sessions(), "activate"],
      mutationFn: academicSessionApi.activate,
    }),

  createSemester: () =>
    createApiMutationOptions<
      ApiSingleResponse<Semester>,
      CreateSemesterPayload
    >({
      mutationKey: [...feeManagementKeys.all, "semesters", "create"],
      mutationFn: semesterApi.create,
    }),

  activateSemester: () =>
    createApiMutationOptions<ApiSingleResponse<Semester>, number>({
      mutationKey: [...feeManagementKeys.all, "semesters", "activate"],
      mutationFn: semesterApi.activate,
    }),
}
