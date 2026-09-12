import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  Faculty,
  Department,
  Program,
  CurriculumLevel,
  CreateFacultyPayload,
  UpdateFacultyPayload,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  CreateProgramPayload,
  UpdateProgramPayload,
  CreateCurriculumLevelPayload,
} from "@/types/school"

// Real backend contract per bruno/academic (the sole source of truth for
// this module — see CLAUDE.md §13). GET list/detail and Create are
// confirmed `{data: ...}`-wrapped (Create via every .bru file's
// `res.body.data.id` post-response script); Update has no example body in
// bruno but is treated the same way, matching Create for the same
// resource. Delete is a soft-deactivate (`isActive: false`), 204 No
// Content, confirmed for Faculty/Department/Program — Level has NO
// delete/update endpoint at all (academic_README.md: levels are
// effectively immutable reference data once created).
const BASE = "/academic"
const AUTH = { access_token: true } as const

export const facultiesApi = {
  async list(): Promise<{ data: Faculty[] }> {
    return apiClient.get<{ data: Faculty[] }>(`${BASE}/faculties`, AUTH)
  },

  async getById(id: number): Promise<{ data: Faculty }> {
    return apiClient.get<{ data: Faculty }>(`${BASE}/faculties/${id}`, AUTH)
  },

  async create(payload: CreateFacultyPayload): Promise<{ data: Faculty }> {
    return apiClient.post<{ data: Faculty }>(`${BASE}/faculties`, payload, AUTH)
  },

  async update(
    id: number,
    payload: UpdateFacultyPayload
  ): Promise<{ data: Faculty }> {
    return apiClient.patch<{ data: Faculty }>(
      `${BASE}/faculties/${id}`,
      payload,
      AUTH
    )
  },

  async deactivate(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/faculties/${id}`, AUTH)
  },

  // GET /academic/faculties/eligible-deans — every user holding the `dean`
  // role; the picker source for Faculty.deanUserId. Response
  // `{data: {id, firstName, lastName, email}[]}`.
  async listEligibleDeans(): Promise<{ data: EligibleDean[] }> {
    return apiClient.get<{ data: EligibleDean[] }>(
      `${BASE}/faculties/eligible-deans`,
      AUTH
    )
  },
}

export interface EligibleDean {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
}

export const departmentsApi = {
  async listByFaculty(facultyId: number): Promise<{ data: Department[] }> {
    return apiClient.get<{ data: Department[] }>(`${BASE}/departments`, {
      ...AUTH,
      params: { facultyId },
    })
  },

  // academic_README.md: "Filterable by facultyId" — omitting it returns every
  // department across every faculty. Used where a flat, faculty-agnostic
  // department picker is needed (e.g. the Course Registry form).
  async listAll(): Promise<{ data: Department[] }> {
    return apiClient.get<{ data: Department[] }>(`${BASE}/departments`, AUTH)
  },

  async getById(id: number): Promise<{ data: Department }> {
    return apiClient.get<{ data: Department }>(
      `${BASE}/departments/${id}`,
      AUTH
    )
  },

  async create(
    payload: CreateDepartmentPayload
  ): Promise<{ data: Department }> {
    return apiClient.post<{ data: Department }>(
      `${BASE}/departments`,
      payload,
      AUTH
    )
  },

  async update(
    id: number,
    payload: UpdateDepartmentPayload
  ): Promise<{ data: Department }> {
    return apiClient.patch<{ data: Department }>(
      `${BASE}/departments/${id}`,
      payload,
      AUTH
    )
  },

  async deactivate(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/departments/${id}`, AUTH)
  },
}

export const programsApi = {
  async list(): Promise<{ data: Program[] }> {
    return apiClient.get<{ data: Program[] }>(`${BASE}/programs`, AUTH)
  },

  async listByDepartment(departmentId: number): Promise<{ data: Program[] }> {
    return apiClient.get<{ data: Program[] }>(`${BASE}/programs`, {
      ...AUTH,
      params: { departmentId },
    })
  },

  async getById(id: number): Promise<{ data: Program }> {
    return apiClient.get<{ data: Program }>(`${BASE}/programs/${id}`, AUTH)
  },

  async create(payload: CreateProgramPayload): Promise<{ data: Program }> {
    return apiClient.post<{ data: Program }>(`${BASE}/programs`, payload, AUTH)
  },

  async update(
    id: number,
    payload: UpdateProgramPayload
  ): Promise<{ data: Program }> {
    return apiClient.patch<{ data: Program }>(
      `${BASE}/programs/${id}`,
      payload,
      AUTH
    )
  },

  async deactivate(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/programs/${id}`, AUTH)
  },
}

export const levelsApi = {
  async list(): Promise<{ data: CurriculumLevel[] }> {
    return apiClient.get<{ data: CurriculumLevel[] }>(`${BASE}/levels`, AUTH)
  },

  async create(
    payload: CreateCurriculumLevelPayload
  ): Promise<{ data: CurriculumLevel }> {
    return apiClient.post<{ data: CurriculumLevel }>(
      `${BASE}/levels`,
      payload,
      AUTH
    )
  },
}

// ── Query keys ──────────────────────────────

export const courseStructureKeys = {
  faculties: {
    all: ["course-structure", "faculties"] as const,
    list: () => [...courseStructureKeys.faculties.all, "list"] as const,
    detail: (id: number) =>
      [...courseStructureKeys.faculties.all, "detail", id] as const,
    eligibleDeans: () =>
      [...courseStructureKeys.faculties.all, "eligible-deans"] as const,
  },
  departments: {
    all: ["course-structure", "departments"] as const,
    list: () => [...courseStructureKeys.departments.all, "list"] as const,
    byFaculty: (facultyId: number) =>
      [
        ...courseStructureKeys.departments.all,
        "by-faculty",
        facultyId,
      ] as const,
    detail: (id: number) =>
      [...courseStructureKeys.departments.all, "detail", id] as const,
  },
  programs: {
    all: ["course-structure", "programs"] as const,
    list: () => [...courseStructureKeys.programs.all, "list"] as const,
    byDepartment: (departmentId: number) =>
      [...courseStructureKeys.programs.all, "by-dept", departmentId] as const,
    detail: (id: number) =>
      [...courseStructureKeys.programs.all, "detail", id] as const,
  },
  levels: {
    all: ["course-structure", "levels"] as const,
    list: () => [...courseStructureKeys.levels.all, "list"] as const,
  },
}

// ── Query options ───────────────────────────

export const courseStructureQueryOptions = {
  faculties: {
    list: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.faculties.list(),
        queryFn: () => facultiesApi.list(),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.faculties.detail(id),
        queryFn: () => facultiesApi.getById(id),
      }),
    eligibleDeans: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.faculties.eligibleDeans(),
        queryFn: () => facultiesApi.listEligibleDeans(),
      }),
  },
  departments: {
    list: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.departments.list(),
        queryFn: () => departmentsApi.listAll(),
      }),
    byFaculty: (facultyId: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.departments.byFaculty(facultyId),
        queryFn: () => departmentsApi.listByFaculty(facultyId),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.departments.detail(id),
        queryFn: () => departmentsApi.getById(id),
      }),
  },
  programs: {
    list: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.programs.list(),
        queryFn: () => programsApi.list(),
      }),
    byDepartment: (departmentId: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.programs.byDepartment(departmentId),
        queryFn: () => programsApi.listByDepartment(departmentId),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.programs.detail(id),
        queryFn: () => programsApi.getById(id),
      }),
  },
  levels: {
    list: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.levels.list(),
        queryFn: () => levelsApi.list(),
      }),
  },
}

// ── Mutation options ────────────────────────

export const courseStructureMutationOptions = {
  createFaculty: () =>
    createApiMutationOptions<{ data: Faculty }, CreateFacultyPayload>({
      mutationKey: [...courseStructureKeys.faculties.all, "create"],
      mutationFn: (payload) => facultiesApi.create(payload),
    }),
  updateFaculty: () =>
    createApiMutationOptions<
      { data: Faculty },
      { id: number; payload: UpdateFacultyPayload }
    >({
      mutationKey: [...courseStructureKeys.faculties.all, "update"],
      mutationFn: ({ id, payload }) => facultiesApi.update(id, payload),
    }),
  deactivateFaculty: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseStructureKeys.faculties.all, "deactivate"],
      mutationFn: (id) => facultiesApi.deactivate(id),
    }),
  createDepartment: () =>
    createApiMutationOptions<{ data: Department }, CreateDepartmentPayload>({
      mutationKey: [...courseStructureKeys.departments.all, "create"],
      mutationFn: (payload) => departmentsApi.create(payload),
    }),
  updateDepartment: () =>
    createApiMutationOptions<
      { data: Department },
      { id: number; payload: UpdateDepartmentPayload }
    >({
      mutationKey: [...courseStructureKeys.departments.all, "update"],
      mutationFn: ({ id, payload }) => departmentsApi.update(id, payload),
    }),
  deactivateDepartment: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseStructureKeys.departments.all, "deactivate"],
      mutationFn: (id) => departmentsApi.deactivate(id),
    }),
  createProgram: () =>
    createApiMutationOptions<{ data: Program }, CreateProgramPayload>({
      mutationKey: [...courseStructureKeys.programs.all, "create"],
      mutationFn: (payload) => programsApi.create(payload),
    }),
  updateProgram: () =>
    createApiMutationOptions<
      { data: Program },
      { id: number; payload: UpdateProgramPayload }
    >({
      mutationKey: [...courseStructureKeys.programs.all, "update"],
      mutationFn: ({ id, payload }) => programsApi.update(id, payload),
    }),
  deactivateProgram: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseStructureKeys.programs.all, "deactivate"],
      mutationFn: (id) => programsApi.deactivate(id),
    }),
  createLevel: () =>
    createApiMutationOptions<
      { data: CurriculumLevel },
      CreateCurriculumLevelPayload
    >({
      mutationKey: [...courseStructureKeys.levels.all, "create"],
      mutationFn: (payload) => levelsApi.create(payload),
    }),
}
