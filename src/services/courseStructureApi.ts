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
  MajorProgram,
  CreateMajorProgramPayload,
  UpdateMajorProgramPayload,
  Cohort,
  CreateCohortPayload,
  UpdateCohortPayload,
  TransitionCohortPayload,
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

  // GET /academic/faculties?majorProgramId= — real, backend-enforced
  // (run_api's FacultyController, A17): most-specific-plus-derived —
  // a Faculty directly tagged with this major program, OR one
  // derivable through its own Departments/Programs, OR (untagged with
  // nothing derivable) a genuinely institution-wide Faculty. Not a
  // client-side filter over listByMajorProgram — the backend already
  // does the resolution.
  async listByMajorProgram(
    majorProgramId: number
  ): Promise<{ data: Faculty[] }> {
    return apiClient.get<{ data: Faculty[] }>(`${BASE}/faculties`, {
      ...AUTH,
      params: { majorProgramId },
    })
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

// Major Programs — bruno/academic/Major Programs - *.bru, contract per
// sandbox/major-program-scoping/API_CONTRACTS.md §6.
export const majorProgramsApi = {
  async list(): Promise<{ data: MajorProgram[] }> {
    return apiClient.get<{ data: MajorProgram[] }>(
      `${BASE}/major-programs`,
      AUTH
    )
  },

  async create(
    payload: CreateMajorProgramPayload
  ): Promise<{ data: MajorProgram }> {
    return apiClient.post<{ data: MajorProgram }>(
      `${BASE}/major-programs`,
      payload,
      AUTH
    )
  },

  async update(
    id: number,
    payload: UpdateMajorProgramPayload
  ): Promise<{ data: MajorProgram }> {
    return apiClient.patch<{ data: MajorProgram }>(
      `${BASE}/major-programs/${id}`,
      payload,
      AUTH
    )
  },

  // Hard delete (409 while any Program still references it) — per
  // bruno/academic/Major Programs - Delete.bru. To deactivate without
  // deleting, PATCH `{isActive: false}` via update() instead.
  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/major-programs/${id}`, AUTH)
  },
}

// Cohorts — contract per sandbox/program-structure-depth/API_CONTRACTS.md §2.
export const cohortsApi = {
  async listByProgram(programId: number): Promise<{ data: Cohort[] }> {
    return apiClient.get<{ data: Cohort[] }>(`${BASE}/cohorts`, {
      ...AUTH,
      params: { programId },
    })
  },

  async create(payload: CreateCohortPayload): Promise<{ data: Cohort }> {
    return apiClient.post<{ data: Cohort }>(`${BASE}/cohorts`, payload, AUTH)
  },

  async update(
    id: number,
    payload: UpdateCohortPayload
  ): Promise<{ data: Cohort }> {
    return apiClient.patch<{ data: Cohort }>(
      `${BASE}/cohorts/${id}`,
      payload,
      AUTH
    )
  },

  async transition(
    id: number,
    payload: TransitionCohortPayload
  ): Promise<{ data: Cohort }> {
    return apiClient.post<{ data: Cohort }>(
      `${BASE}/cohorts/${id}/transition`,
      payload,
      AUTH
    )
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`${BASE}/cohorts/${id}`, AUTH)
  },
}

// ── Query keys ──────────────────────────────

export const courseStructureKeys = {
  faculties: {
    all: ["course-structure", "faculties"] as const,
    list: () => [...courseStructureKeys.faculties.all, "list"] as const,
    byMajorProgram: (majorProgramId: number) =>
      [
        ...courseStructureKeys.faculties.all,
        "by-major-program",
        majorProgramId,
      ] as const,
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
  majorPrograms: {
    all: ["course-structure", "major-programs"] as const,
    list: () => [...courseStructureKeys.majorPrograms.all, "list"] as const,
  },
  cohorts: {
    all: ["course-structure", "cohorts"] as const,
    byProgram: (programId: number) =>
      [...courseStructureKeys.cohorts.all, "by-program", programId] as const,
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
    byMajorProgram: (majorProgramId: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.faculties.byMajorProgram(majorProgramId),
        queryFn: () => facultiesApi.listByMajorProgram(majorProgramId),
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
  majorPrograms: {
    list: () =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.majorPrograms.list(),
        queryFn: () => majorProgramsApi.list(),
      }),
  },
  cohorts: {
    byProgram: (programId: number) =>
      createApiQueryOptions({
        queryKey: courseStructureKeys.cohorts.byProgram(programId),
        queryFn: () => cohortsApi.listByProgram(programId),
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
  createMajorProgram: () =>
    createApiMutationOptions<{ data: MajorProgram }, CreateMajorProgramPayload>(
      {
        mutationKey: [...courseStructureKeys.majorPrograms.all, "create"],
        mutationFn: (payload) => majorProgramsApi.create(payload),
      }
    ),
  updateMajorProgram: () =>
    createApiMutationOptions<
      { data: MajorProgram },
      { id: number; payload: UpdateMajorProgramPayload }
    >({
      mutationKey: [...courseStructureKeys.majorPrograms.all, "update"],
      mutationFn: ({ id, payload }) => majorProgramsApi.update(id, payload),
    }),
  removeMajorProgram: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseStructureKeys.majorPrograms.all, "remove"],
      mutationFn: (id) => majorProgramsApi.remove(id),
    }),
  createCohort: () =>
    createApiMutationOptions<{ data: Cohort }, CreateCohortPayload>({
      mutationKey: [...courseStructureKeys.cohorts.all, "create"],
      mutationFn: (payload) => cohortsApi.create(payload),
    }),
  updateCohort: () =>
    createApiMutationOptions<
      { data: Cohort },
      { id: number; payload: UpdateCohortPayload }
    >({
      mutationKey: [...courseStructureKeys.cohorts.all, "update"],
      mutationFn: ({ id, payload }) => cohortsApi.update(id, payload),
    }),
  transitionCohort: () =>
    createApiMutationOptions<
      { data: Cohort },
      { id: number; payload: TransitionCohortPayload }
    >({
      mutationKey: [...courseStructureKeys.cohorts.all, "transition"],
      mutationFn: ({ id, payload }) => cohortsApi.transition(id, payload),
    }),
  removeCohort: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseStructureKeys.cohorts.all, "remove"],
      mutationFn: (id) => cohortsApi.remove(id),
    }),
}
