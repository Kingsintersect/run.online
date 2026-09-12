// ─── Grading Schemes Service ────────────────────────────────────────────────
//
// Confirmed live — see sandbox/schema-moodel-sync-refactor/api-v2.md
// §"Grading Schemes — /grading-schemes" (the authoritative contract);
// tracked as MISSING_BACKEND_APIS.md §2.16, now shipped by the backend team.
// Does not touch the already-real `GET /grade-scales` (grades.service.ts's
// getGradeScales) — that endpoint keeps serving the institution's default
// scheme's scales exactly as before; this is purely additive, for
// institutions/programs that need a second scheme.

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  CreateGradingSchemePayload,
  CreateSchemeScalePayload,
  GradeScale,
  GradingScheme,
} from "../types/grades.types"

const BASE = "/grading-schemes"
const AUTH = { access_token: true } as const

export const gradingSchemesApi = {
  async list(): Promise<GradingScheme[]> {
    const res = await apiClient.get<{ data: GradingScheme[] }>(BASE, AUTH)
    return res.data
  },

  async create(payload: CreateGradingSchemePayload): Promise<GradingScheme> {
    const res = await apiClient.post<{ data: GradingScheme }>(
      BASE,
      payload,
      AUTH
    )
    return res.data
  },

  async addScale(
    schemeId: number,
    payload: CreateSchemeScalePayload
  ): Promise<GradeScale> {
    const res = await apiClient.post<{ data: GradeScale }>(
      `${BASE}/${schemeId}/scales`,
      payload,
      AUTH
    )
    return res.data
  },
}

// ── Query keys ────────────────────────────────

export const gradingSchemesKeys = {
  all: ["grading-schemes"] as const,
  list: () => [...gradingSchemesKeys.all, "list"] as const,
}

// ── Query options ─────────────────────────────

export const gradingSchemesQueryOptions = {
  list: () =>
    createApiQueryOptions({
      queryKey: gradingSchemesKeys.list(),
      queryFn: () => gradingSchemesApi.list(),
    }),
}

// ── Mutation options ──────────────────────────

export const gradingSchemesMutationOptions = {
  create: () =>
    createApiMutationOptions<GradingScheme, CreateGradingSchemePayload>({
      mutationKey: [...gradingSchemesKeys.all, "create"],
      mutationFn: (payload) => gradingSchemesApi.create(payload),
    }),
  addScale: () =>
    createApiMutationOptions<
      GradeScale,
      { schemeId: number; payload: CreateSchemeScalePayload }
    >({
      mutationKey: [...gradingSchemesKeys.all, "add-scale"],
      mutationFn: ({ schemeId, payload }) =>
        gradingSchemesApi.addScale(schemeId, payload),
    }),
}
