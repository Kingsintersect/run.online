import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  Course,
  CourseType,
  ProgramCourse,
  CreateCoursePayload,
  UpdateCoursePayload,
  AssignCourseToProgramPayload,
} from "@/types/school"

// Real backend contract per bruno/course and sandbox/course/course_README.md
// (source of truth — see CLAUDE.md §13). Every endpoint here returns its
// resource wrapped in `{data: ...}`, confirmed by Course - Create.bru's
// post-response script reading `res.body?.data?.id`. The backend uses
// camelCase field names throughout; this module's frontend types stay
// snake_case, so every function maps between the two.
const AUTH = { access_token: true } as const

interface WireCourse {
  id: number
  code: string
  title: string
  description: string | null
  creditUnits: number
  courseType: CourseType
  levelId: number
  owningDepartmentId: number | null
  syllabus: string | null
  curriculumSemester: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const mapCourse = (c: WireCourse): Course => ({
  id: c.id,
  code: c.code,
  title: c.title,
  description: c.description,
  credit_units: c.creditUnits,
  course_type: c.courseType,
  level_id: c.levelId,
  owning_department_id: c.owningDepartmentId,
  syllabus: c.syllabus,
  curriculum_semester: c.curriculumSemester,
  is_active: c.isActive,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
})

export interface CourseListFilters {
  courseType?: CourseType
  levelId?: number
  departmentId?: number
}

// ── Courses API ─────────────────────────────

export const coursesApi = {
  async list(filters?: CourseListFilters): Promise<{ data: Course[] }> {
    const res = await apiClient.get<{ data: WireCourse[] }>("/courses", {
      ...AUTH,
      params: filters as Record<string, unknown> | undefined,
    })
    return { data: res.data.map(mapCourse) }
  },

  async getById(id: number): Promise<{ data: Course }> {
    const res = await apiClient.get<{ data: WireCourse }>(
      `/courses/${id}`,
      AUTH
    )
    return { data: mapCourse(res.data) }
  },

  async create(payload: CreateCoursePayload): Promise<{ data: Course }> {
    const res = await apiClient.post<{ data: WireCourse }>(
      "/courses",
      {
        code: payload.code,
        title: payload.title,
        description: payload.description,
        creditUnits: payload.credit_units,
        courseType: payload.course_type,
        levelId: payload.level_id,
        owningDepartmentId: payload.owning_department_id ?? undefined,
        syllabus: payload.syllabus,
      },
      AUTH
    )
    return { data: mapCourse(res.data) }
  },

  async update(
    id: number,
    payload: UpdateCoursePayload
  ): Promise<{ data: Course }> {
    const res = await apiClient.patch<{ data: WireCourse }>(
      `/courses/${id}`,
      {
        code: payload.code,
        title: payload.title,
        description: payload.description,
        creditUnits: payload.credit_units,
        courseType: payload.course_type,
        levelId: payload.level_id,
        owningDepartmentId: payload.owning_department_id,
        syllabus: payload.syllabus,
      },
      AUTH
    )
    return { data: mapCourse(res.data) }
  },

  // Soft delete — sets isActive: false. 204 No Content.
  async deactivate(id: number): Promise<void> {
    return apiClient.delete<void>(`/courses/${id}`, AUTH)
  },
}

// ── Program Courses API ─────────────────────
// No reverse "programs for a course" lookup exists — only "courses for a
// program" (used here) — and no dedicated update-mapping endpoint, so
// toggling `isRequired` is implemented as remove+reassign at the call site.

export const programCoursesApi = {
  async listByProgram(programId: number): Promise<{ data: ProgramCourse[] }> {
    const res = await apiClient.get<{
      data: (WireCourse & { isRequired: boolean })[]
    }>(`/courses/programs/${programId}`, AUTH)
    return {
      data: res.data.map((c) => ({
        ...mapCourse(c),
        is_required: c.isRequired,
      })),
    }
  },

  async assign(payload: AssignCourseToProgramPayload): Promise<void> {
    await apiClient.post(
      `/courses/programs/${payload.program_id}`,
      {
        courseId: payload.course_id,
        isRequired: payload.is_required,
      },
      AUTH
    )
  },

  async remove(programId: number, courseId: number): Promise<void> {
    return apiClient.delete<void>(
      `/courses/programs/${programId}/${courseId}`,
      AUTH
    )
  },
}

// ── Query keys ──────────────────────────────

export const courseManagementKeys = {
  courses: {
    all: ["course-management", "courses"] as const,
    list: (filters?: CourseListFilters) =>
      [...courseManagementKeys.courses.all, "list", filters ?? {}] as const,
    detail: (id: number) =>
      [...courseManagementKeys.courses.all, "detail", id] as const,
  },
  programCourses: {
    all: ["course-management", "program-courses"] as const,
    byProgram: (programId: number) =>
      [
        ...courseManagementKeys.programCourses.all,
        "by-program",
        programId,
      ] as const,
  },
}

// ── Query options ───────────────────────────

export const courseManagementQueryOptions = {
  courses: {
    list: (filters?: CourseListFilters) =>
      createApiQueryOptions({
        queryKey: courseManagementKeys.courses.list(filters),
        queryFn: () => coursesApi.list(filters),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: courseManagementKeys.courses.detail(id),
        queryFn: () => coursesApi.getById(id),
      }),
  },
  programCourses: {
    byProgram: (programId: number) =>
      createApiQueryOptions({
        queryKey: courseManagementKeys.programCourses.byProgram(programId),
        queryFn: () => programCoursesApi.listByProgram(programId),
      }),
  },
}

// ── Mutation options ────────────────────────

export const courseManagementMutationOptions = {
  createCourse: () =>
    createApiMutationOptions<{ data: Course }, CreateCoursePayload>({
      mutationKey: [...courseManagementKeys.courses.all, "create"],
      mutationFn: (payload) => coursesApi.create(payload),
    }),
  updateCourse: () =>
    createApiMutationOptions<
      { data: Course },
      { id: number; payload: UpdateCoursePayload }
    >({
      mutationKey: [...courseManagementKeys.courses.all, "update"],
      mutationFn: ({ id, payload }) => coursesApi.update(id, payload),
    }),
  deactivateCourse: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseManagementKeys.courses.all, "deactivate"],
      mutationFn: (id) => coursesApi.deactivate(id),
    }),
  assignCourseToProgram: () =>
    createApiMutationOptions<void, AssignCourseToProgramPayload>({
      mutationKey: [...courseManagementKeys.programCourses.all, "assign"],
      mutationFn: (payload) => programCoursesApi.assign(payload),
    }),
  removeProgramCourse: () =>
    createApiMutationOptions<void, { programId: number; courseId: number }>({
      mutationKey: [...courseManagementKeys.programCourses.all, "remove"],
      mutationFn: ({ programId, courseId }) =>
        programCoursesApi.remove(programId, courseId),
    }),
}
