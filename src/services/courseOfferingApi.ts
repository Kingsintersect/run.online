import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  CourseOffering,
  CourseOfferingDetail,
  CourseOfferingStatus,
  CreateOfferingPayload,
  UpdateOfferingPayload,
  AssignLecturerPayload,
  OfferingLecturerAssignment,
  OfferingLecturerRole,
  ClassSchedule,
  CreateSchedulePayload,
  UpdateSchedulePayload,
} from "@/types/school"
import { dedupeAsync } from "@/lib/utils/dedupe-async"
import {
  fetchAcademicTermNames,
  mapCourseOfferingEnrichment,
  type AcademicTermNames,
  type WireEnrichedCourseFields,
} from "@/lib/academic/course-offering-enrichment"

// Real backend contract per bruno/course (Offering/Offering Lecturer/Schedule
// collections) and sandbox/course/course_README.md — source of truth, see
// CLAUDE.md §13. Every endpoint returns `{data: ...}`; the backend uses
// camelCase, this module's frontend types stay snake_case, mapped here.
const AUTH = { access_token: true } as const

interface WireOffering {
  id: number
  courseId: number
  academicSessionId: number
  semesterId: number
  maxCapacity: number | null
  status: CourseOfferingStatus
  createdAt: string
  updatedAt: string
  course: { code: string; title: string } & WireEnrichedCourseFields
  // `session`/`semester` (names) and `enrolledCount` + the enriched `course`
  // fields come from sandbox/course/missing_course_offering_enrichment.readme.md
  // and are mapped defensively via `mapCourseOfferingEnrichment`.
  session?: { id: number; name: string }
  semester?: { id: number; name: string }
  enrolledCount?: number
}

interface WireOfferingLecturer {
  lecturerId: number
  role: OfferingLecturerRole
}

interface WireSchedule {
  id: number
  offeringId: number
  lecturerId: number
  dayOfWeek: string
  startTime: string
  endTime: string
  venue: string
  classType: string
}

interface WireOfferingDetail extends WireOffering {
  lecturers?: WireOfferingLecturer[]
  schedule?: WireSchedule[]
}

const mapOffering = (
  o: WireOffering,
  terms?: AcademicTermNames
): CourseOffering => ({
  id: o.id,
  course_id: o.courseId,
  course_code: o.course?.code ?? "—",
  course_title: o.course?.title ?? "Untitled course",
  academic_session_id: o.academicSessionId,
  semester_id: o.semesterId,
  max_capacity: o.maxCapacity,
  status: o.status,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
  ...mapCourseOfferingEnrichment(o, terms),
})

const mapSchedule = (s: WireSchedule): ClassSchedule => ({
  id: s.id,
  offering_id: s.offeringId,
  lecturer_id: s.lecturerId,
  day_of_week: s.dayOfWeek,
  start_time: s.startTime,
  end_time: s.endTime,
  venue: s.venue,
  class_type: s.classType,
})

export interface OfferingListFilters {
  semesterId?: number
  sessionId?: number
}

// ── Offerings ────────────────────────────────

async function listOfferings(
  filters?: OfferingListFilters
): Promise<{ data: CourseOffering[] }> {
  const [res, terms] = await Promise.all([
    apiClient.get<{ data: WireOffering[] }>("/courses/offerings", {
      ...AUTH,
      params: filters as Record<string, unknown> | undefined,
    }),
    fetchAcademicTermNames(),
  ])
  return { data: (res.data ?? []).map((o) => mapOffering(o, terms)) }
}

// Unfiltered offering list used purely as a name-lookup table by the
// enrollment/timetable/calendar mappers. Several composite queries need it
// per page load and it's a plain fetch React Query can't dedupe, so it's
// wrapped: a burst shares one request + a 30s result. Filtered/UI reads go
// through `offeringsApi.list()` (via React Query) as before.
//
// Kept as a module-level binding rather than an `offeringsApi` property whose
// initializer calls `offeringsApi.list()` — that self-reference gave the whole
// object an implicit `any` (TS7022), which silently collapsed every
// `offeringsApi.list()` consumer's result type to `{}`.
const listSharedOfferings = dedupeAsync(() => listOfferings(), 30_000)

export const offeringsApi = {
  list: listOfferings,
  listShared: listSharedOfferings,

  async getById(id: number): Promise<{ data: CourseOfferingDetail }> {
    const [res, terms] = await Promise.all([
      apiClient.get<{ data: WireOfferingDetail }>(
        `/courses/offerings/${id}`,
        AUTH
      ),
      fetchAcademicTermNames(),
    ])
    const lecturers: OfferingLecturerAssignment[] = (
      res.data.lecturers ?? []
    ).map((l) => ({
      lecturer_id: l.lecturerId,
      role: l.role,
    }))
    const schedules = (res.data.schedule ?? []).map(mapSchedule)
    return {
      data: { ...mapOffering(res.data, terms), lecturers, schedules },
    }
  },

  async create(
    payload: CreateOfferingPayload
  ): Promise<{ data: CourseOffering }> {
    const res = await apiClient.post<{ data: WireOffering }>(
      "/courses/offerings",
      {
        courseId: payload.course_id,
        academicSessionId: payload.academic_session_id,
        semesterId: payload.semester_id,
        maxCapacity: payload.max_capacity,
        status: payload.status,
      },
      AUTH
    )
    return { data: mapOffering(res.data) }
  },

  async update(
    id: number,
    payload: UpdateOfferingPayload
  ): Promise<{ data: CourseOffering }> {
    const res = await apiClient.patch<{ data: WireOffering }>(
      `/courses/offerings/${id}`,
      {
        maxCapacity: payload.max_capacity,
        status: payload.status,
      },
      AUTH
    )
    return { data: mapOffering(res.data) }
  },

  // Soft-cancel: sets status = CANCELLED. 204 No Content.
  async cancel(id: number): Promise<void> {
    return apiClient.delete<void>(`/courses/offerings/${id}`, AUTH)
  },
}

// ── Offering Lecturers ───────────────────────

export const offeringLecturersApi = {
  async assign(payload: AssignLecturerPayload): Promise<void> {
    await apiClient.post(
      `/courses/offerings/${payload.offering_id}/lecturers`,
      {
        lecturerId: payload.lecturer_id,
        role: payload.role ?? "primary",
      },
      AUTH
    )
  },

  async remove(offeringId: number, lecturerId: number): Promise<void> {
    return apiClient.delete<void>(
      `/courses/offerings/${offeringId}/lecturers/${lecturerId}`,
      AUTH
    )
  },
}

// ── Class Schedules ──────────────────────────

export const schedulesApi = {
  async listByOffering(offeringId: number): Promise<{ data: ClassSchedule[] }> {
    const res = await apiClient.get<{ data: WireSchedule[] }>(
      `/courses/offerings/${offeringId}/schedules`,
      AUTH
    )
    return { data: res.data.map(mapSchedule) }
  },

  async create(
    payload: CreateSchedulePayload
  ): Promise<{ data: ClassSchedule }> {
    const res = await apiClient.post<{ data: WireSchedule }>(
      `/courses/offerings/${payload.offering_id}/schedules`,
      {
        lecturerId: payload.lecturer_id,
        dayOfWeek: payload.day_of_week,
        startTime: payload.start_time,
        endTime: payload.end_time,
        venue: payload.venue,
        classType: payload.class_type,
      },
      AUTH
    )
    return { data: mapSchedule(res.data) }
  },

  async update(
    id: number,
    payload: UpdateSchedulePayload
  ): Promise<{ data: ClassSchedule }> {
    const res = await apiClient.patch<{ data: WireSchedule }>(
      `/courses/schedules/${id}`,
      {
        lecturerId: payload.lecturer_id,
        dayOfWeek: payload.day_of_week,
        startTime: payload.start_time,
        endTime: payload.end_time,
        venue: payload.venue,
        classType: payload.class_type,
      },
      AUTH
    )
    return { data: mapSchedule(res.data) }
  },

  // Hard delete (unlike Course/Offering). 204 No Content.
  async remove(id: number): Promise<void> {
    return apiClient.delete<void>(`/courses/schedules/${id}`, AUTH)
  },
}

// ── Query keys ──────────────────────────────

export const courseOfferingKeys = {
  all: ["course-offerings"] as const,
  list: (filters?: OfferingListFilters) =>
    [...courseOfferingKeys.all, "list", filters ?? {}] as const,
  detail: (id: number) => [...courseOfferingKeys.all, "detail", id] as const,
  schedules: (offeringId: number) =>
    [...courseOfferingKeys.all, "schedules", offeringId] as const,
}

// ── Query options ───────────────────────────

export const courseOfferingQueryOptions = {
  list: (filters?: OfferingListFilters) =>
    createApiQueryOptions({
      queryKey: courseOfferingKeys.list(filters),
      queryFn: () => offeringsApi.list(filters),
    }),
  detail: (id: number) =>
    createApiQueryOptions({
      queryKey: courseOfferingKeys.detail(id),
      queryFn: () => offeringsApi.getById(id),
    }),
  schedules: (offeringId: number) =>
    createApiQueryOptions({
      queryKey: courseOfferingKeys.schedules(offeringId),
      queryFn: () => schedulesApi.listByOffering(offeringId),
    }),
}

// ── Mutation options ────────────────────────

export const courseOfferingMutationOptions = {
  create: () =>
    createApiMutationOptions<{ data: CourseOffering }, CreateOfferingPayload>({
      mutationKey: [...courseOfferingKeys.all, "create"],
      mutationFn: (payload) => offeringsApi.create(payload),
    }),
  update: () =>
    createApiMutationOptions<
      { data: CourseOffering },
      { id: number; payload: UpdateOfferingPayload }
    >({
      mutationKey: [...courseOfferingKeys.all, "update"],
      mutationFn: ({ id, payload }) => offeringsApi.update(id, payload),
    }),
  cancel: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseOfferingKeys.all, "cancel"],
      mutationFn: (id) => offeringsApi.cancel(id),
    }),
  assignLecturer: () =>
    createApiMutationOptions<void, AssignLecturerPayload>({
      mutationKey: [...courseOfferingKeys.all, "assign-lecturer"],
      mutationFn: (payload) => offeringLecturersApi.assign(payload),
    }),
  removeLecturer: () =>
    createApiMutationOptions<void, { offeringId: number; lecturerId: number }>({
      mutationKey: [...courseOfferingKeys.all, "remove-lecturer"],
      mutationFn: ({ offeringId, lecturerId }) =>
        offeringLecturersApi.remove(offeringId, lecturerId),
    }),
  createSchedule: () =>
    createApiMutationOptions<{ data: ClassSchedule }, CreateSchedulePayload>({
      mutationKey: [...courseOfferingKeys.all, "create-schedule"],
      mutationFn: (payload) => schedulesApi.create(payload),
    }),
  updateSchedule: () =>
    createApiMutationOptions<
      { data: ClassSchedule },
      { id: number; payload: UpdateSchedulePayload }
    >({
      mutationKey: [...courseOfferingKeys.all, "update-schedule"],
      mutationFn: ({ id, payload }) => schedulesApi.update(id, payload),
    }),
  removeSchedule: () =>
    createApiMutationOptions<void, number>({
      mutationKey: [...courseOfferingKeys.all, "remove-schedule"],
      mutationFn: (id) => schedulesApi.remove(id),
    }),
}
