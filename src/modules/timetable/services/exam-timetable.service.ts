import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  Venue,
  CreateVenuePayload,
  UpdateVenuePayload,
  ExamSchedule,
  CreateExamSchedulePayload,
  UpdateExamSchedulePayload,
  ExamScheduleFilters,
  ExamConflictCheckParams,
  ExamConflictCheckResult,
} from "../types/exam-timetable.types"

// Exam Timetable — sandbox/exam-timetable/API_CONTRACTS.md.
const BASE = "/timetable"
const AUTH = { access_token: true } as const

export const venuesApi = {
  async list(
    filters: { isExamHall?: boolean; isActive?: boolean } = {}
  ): Promise<{ data: Venue[] }> {
    // GET /timetable/venues is currently the class-timetable venue-name
    // autocomplete (bruno/timetable/Venues - List.bru, `string[]`), not the
    // exam Venue entity — keep only Venue objects so exam screens never
    // render bare name strings as venues.
    const res = await apiClient.get<{ data: (Venue | string)[] }>(
      `${BASE}/venues`,
      { ...AUTH, params: filters }
    )
    return {
      data: (res.data ?? []).filter(
        (v): v is Venue => typeof v === "object" && v !== null
      ),
    }
  },

  async create(payload: CreateVenuePayload): Promise<{ data: Venue }> {
    return apiClient.post<{ data: Venue }>(`${BASE}/venues`, payload, AUTH)
  },

  async update(
    id: number,
    payload: UpdateVenuePayload
  ): Promise<{ data: Venue }> {
    return apiClient.patch<{ data: Venue }>(
      `${BASE}/venues/${id}`,
      payload,
      AUTH
    )
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/venues/${id}`, AUTH)
  },
}

export const examSchedulesApi = {
  // `filters.majorProgramId` — see ExamScheduleFilters' own comment
  // (sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35).
  async list(filters: ExamScheduleFilters = {}): Promise<{
    data: ExamSchedule[]
    meta: { total: number; page: number; limit: number }
  }> {
    return apiClient.get<{
      data: ExamSchedule[]
      meta: { total: number; page: number; limit: number }
    }>(`${BASE}/exams`, {
      ...AUTH,
      params: filters as Record<string, unknown>,
    })
  },

  async listMine(): Promise<{ data: ExamSchedule[] }> {
    return apiClient.get<{ data: ExamSchedule[] }>(`${BASE}/exams/my`, AUTH)
  },

  async create(
    payload: CreateExamSchedulePayload
  ): Promise<{ data: ExamSchedule }> {
    return apiClient.post<{ data: ExamSchedule }>(
      `${BASE}/exams`,
      payload,
      AUTH
    )
  },

  async update(
    id: number,
    payload: UpdateExamSchedulePayload
  ): Promise<{ data: ExamSchedule }> {
    return apiClient.patch<{ data: ExamSchedule }>(
      `${BASE}/exams/${id}`,
      payload,
      AUTH
    )
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/exams/${id}`, AUTH)
  },

  async checkConflict(
    params: ExamConflictCheckParams
  ): Promise<ExamConflictCheckResult> {
    return apiClient.get<ExamConflictCheckResult>(
      `${BASE}/exams/check-conflict`,
      {
        ...AUTH,
        params: {
          ...params,
          invigilatorIds: params.invigilatorIds?.join(",") as
            | string
            | undefined,
        } as Record<string, unknown>,
      }
    )
  },
}

// ── Query keys ──────────────────────────────

export const examTimetableKeys = {
  venues: {
    all: ["exam-timetable", "venues"] as const,
    list: (filters?: { isExamHall?: boolean; isActive?: boolean }) =>
      [...examTimetableKeys.venues.all, "list", filters ?? {}] as const,
  },
  exams: {
    all: ["exam-timetable", "exams"] as const,
    list: (filters?: ExamScheduleFilters) =>
      [...examTimetableKeys.exams.all, "list", filters ?? {}] as const,
    mine: () => [...examTimetableKeys.exams.all, "mine"] as const,
  },
}

// ── Query options ───────────────────────────

export const examTimetableQueryOptions = {
  venues: {
    list: (filters?: { isExamHall?: boolean; isActive?: boolean }) =>
      createApiQueryOptions({
        queryKey: examTimetableKeys.venues.list(filters),
        queryFn: () => venuesApi.list(filters),
      }),
  },
  exams: {
    list: (filters?: ExamScheduleFilters) =>
      createApiQueryOptions({
        queryKey: examTimetableKeys.exams.list(filters),
        queryFn: () => examSchedulesApi.list(filters),
      }),
    mine: () =>
      createApiQueryOptions({
        queryKey: examTimetableKeys.exams.mine(),
        queryFn: () => examSchedulesApi.listMine(),
      }),
  },
}

// ── Mutation options ────────────────────────

export const examTimetableMutationOptions = {
  createVenue: () =>
    createApiMutationOptions<{ data: Venue }, CreateVenuePayload>({
      mutationKey: [...examTimetableKeys.venues.all, "create"],
      mutationFn: (payload) => venuesApi.create(payload),
    }),
  updateVenue: () =>
    createApiMutationOptions<
      { data: Venue },
      { id: number; payload: UpdateVenuePayload }
    >({
      mutationKey: [...examTimetableKeys.venues.all, "update"],
      mutationFn: ({ id, payload }) => venuesApi.update(id, payload),
    }),
  removeVenue: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...examTimetableKeys.venues.all, "remove"],
      mutationFn: (id) => venuesApi.remove(id),
    }),
  createExamSchedule: () =>
    createApiMutationOptions<{ data: ExamSchedule }, CreateExamSchedulePayload>(
      {
        mutationKey: [...examTimetableKeys.exams.all, "create"],
        mutationFn: (payload) => examSchedulesApi.create(payload),
      }
    ),
  updateExamSchedule: () =>
    createApiMutationOptions<
      { data: ExamSchedule },
      { id: number; payload: UpdateExamSchedulePayload }
    >({
      mutationKey: [...examTimetableKeys.exams.all, "update"],
      mutationFn: ({ id, payload }) => examSchedulesApi.update(id, payload),
    }),
  removeExamSchedule: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...examTimetableKeys.exams.all, "remove"],
      mutationFn: (id) => examSchedulesApi.remove(id),
    }),
}
