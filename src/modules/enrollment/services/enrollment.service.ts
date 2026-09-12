// ─── Enrollment Service ─────────────────────────────────────────────────────
//
// Real backend contract per bruno/enrollment/*.bru and sandbox/enrollment/
// enrollment_README.md (source of truth — see CLAUDE.md §13). This is a
// from-scratch build — no prior frontend code touched `/enrollments` at all.
//
// Response nesting differs per endpoint and none of it is confirmed by an
// example body beyond the README's prose: By-Student nests `offering`,
// By-Offering nests `student`, plain List is unconfirmed either way. Rather
// than have every consumer read a different shape, every method maps into
// one flat `EnrollmentRecord`, enriching from the already-real Course
// Offering (`offeringsApi.list()`) and Student (`usersApi.listStudents()`)
// lookups whenever an endpoint's own response doesn't carry the name fields
// — the same defensive dual-lookup pattern used for Timetable's schedules.

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import { dedupeAsync } from "@/lib/utils/dedupe-async"
import { canAny } from "@/lib/permissions/can"
import { offeringsApi } from "@/services/courseOfferingApi"
import { usersApi } from "@/services/usersApi"
import { timetableService } from "@/modules/timetable/services/timetable.service"
import type { CourseOffering } from "@/types/school"
import type { Student } from "@/types/users"
import type {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  BulkAttendanceDto,
  BulkAttendanceResult,
  BulkEnrollDto,
  BulkEnrollResult,
  CreateEnrollmentDto,
  DropEnrollmentDto,
  DropEnrollmentResult,
  EnrollmentFilter,
  EnrollmentPage,
  EnrollmentRecord,
  EnrollmentStatus,
  MoodleLaunchResult,
  MyCourseSummary,
  RecordAttendanceDto,
  UpdateAttendanceDto,
} from "../types"

const BASE = "/enrollments"
const AUTH = { access_token: true } as const

// ── Raw wire shapes (best-effort — see file header) ─────────────────────────

interface RawEnrollment {
  id: number
  studentId: number
  offeringId: number
  semesterId: number
  status: EnrollmentStatus
  enrolledAt: string
  droppedAt: string | null
  offering?: {
    course?: { code?: string; title?: string; creditUnits?: number }
    lecturers?: {
      lecturer?: {
        user?: { firstName?: string | null; lastName?: string | null }
      }
    }[]
  }
  student?: {
    matricNumber?: string
    user?: { firstName?: string | null; lastName?: string | null }
  }
}

interface RawAttendance {
  id: number
  studentId: number
  scheduleId: number
  attendanceDate: string
  status: AttendanceStatus
  remarks: string | null
  createdAt: string
  student?: {
    matricNumber?: string
    user?: { firstName?: string | null; lastName?: string | null }
  }
}

// Shared offering/student name lookups, reused by every mapper below so a
// list of N enrollments costs 2 extra requests, not 2N.
//
// - `dedupeAsync`: several composite queries (by-student, attendance summary,
//   …) each need these on every run, and they're plain `apiClient` calls that
//   React Query can't dedupe — so a burst of them on one page load shares a
//   single fetch + a short-lived result instead of hammering the API.
// - the student list is only fetched for users who can actually view it
//   (`students.view`/`manage`); for a student looking at their *own*
//   enrollments it would just 403. `mapEnrollment` falls back to the
//   enrollment response's own nested `student`/`offering` fields either way.
const buildLookups = dedupeAsync(
  async (): Promise<{
    offeringsById: Map<number, CourseOffering>
    studentsById: Map<number, Student>
  }> => {
    const canListStudents = canAny([
      ["students", "view"],
      ["students", "manage"],
    ])
    const [offeringsRes, studentsRes] = await Promise.all([
      offeringsApi.listShared().catch(() => ({ data: [] as CourseOffering[] })),
      canListStudents
        ? usersApi
            .listStudents({ limit: 100 })
            .catch(() => ({ data: [] as Student[], total: 0 }))
        : Promise.resolve({ data: [] as Student[], total: 0 }),
    ])
    return {
      offeringsById: new Map(offeringsRes.data.map((o) => [o.id, o])),
      studentsById: new Map(studentsRes.data.map((s) => [s.id, s])),
    }
  }
)

function fullName(
  user?: {
    first_name?: string | null
    last_name?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
): string {
  if (!user) return "—"
  const first = user.first_name ?? user.firstName ?? ""
  const last = user.last_name ?? user.lastName ?? ""
  return `${first} ${last}`.trim() || "—"
}

function mapEnrollment(
  raw: RawEnrollment,
  offeringsById: Map<number, CourseOffering>,
  studentsById: Map<number, Student>
): EnrollmentRecord {
  const offering = offeringsById.get(raw.offeringId)
  const student = studentsById.get(raw.studentId)
  const lecturerUser = raw.offering?.lecturers?.[0]?.lecturer?.user
  return {
    id: raw.id,
    studentId: raw.studentId,
    offeringId: raw.offeringId,
    semesterId: raw.semesterId,
    status: raw.status,
    enrolledAt: raw.enrolledAt,
    droppedAt: raw.droppedAt,
    studentName: raw.student?.user
      ? fullName(raw.student.user)
      : fullName(student?.user),
    studentMatric: raw.student?.matricNumber ?? student?.matric_number ?? "—",
    courseCode: raw.offering?.course?.code ?? offering?.course_code ?? "—",
    courseTitle: raw.offering?.course?.title ?? offering?.course_title ?? "—",
    creditUnits:
      raw.offering?.course?.creditUnits ?? offering?.credit_units ?? 0,
    lecturerName: lecturerUser ? fullName(lecturerUser) : null,
  }
}

function mapAttendance(
  raw: RawAttendance,
  studentsById: Map<number, Student>
): AttendanceRecord {
  const student = studentsById.get(raw.studentId)
  return {
    id: raw.id,
    studentId: raw.studentId,
    scheduleId: raw.scheduleId,
    attendanceDate: raw.attendanceDate,
    status: raw.status,
    remarks: raw.remarks,
    createdAt: raw.createdAt,
    studentName: raw.student?.user
      ? fullName(raw.student.user)
      : fullName(student?.user),
    studentMatric: raw.student?.matricNumber ?? student?.matric_number ?? "—",
  }
}

// ── enrollmentApi ────────────────────────────────────────────────────────────

export const enrollmentApi = {
  async list(filters: Partial<EnrollmentFilter> = {}): Promise<EnrollmentPage> {
    const [res, { offeringsById, studentsById }] = await Promise.all([
      apiClient.get<{
        data: RawEnrollment[]
        meta: { total: number; page: number; limit: number }
      }>(BASE, {
        ...AUTH,
        params: {
          semesterId: filters.semesterId,
          studentId: filters.studentId,
          offeringId: filters.offeringId,
          limit: filters.limit,
        },
      }),
      buildLookups(),
    ])
    return {
      data: res.data.map((r) => mapEnrollment(r, offeringsById, studentsById)),
      meta: res.meta,
    }
  },

  async getById(id: number): Promise<EnrollmentRecord> {
    const [res, { offeringsById, studentsById }] = await Promise.all([
      apiClient.get<{ data: RawEnrollment }>(`${BASE}/${id}`, AUTH),
      buildLookups(),
    ])
    return mapEnrollment(res.data, offeringsById, studentsById)
  },

  async getByStudent(
    studentId: number,
    params: { semesterId?: number; status?: EnrollmentStatus } = {}
  ): Promise<EnrollmentRecord[]> {
    const [res, { offeringsById, studentsById }] = await Promise.all([
      apiClient.get<{ data: RawEnrollment[] }>(`${BASE}/student/${studentId}`, {
        ...AUTH,
        params,
      }),
      buildLookups(),
    ])
    return res.data.map((r) => mapEnrollment(r, offeringsById, studentsById))
  },

  async getByOffering(offeringId: number): Promise<EnrollmentRecord[]> {
    const [res, { offeringsById, studentsById }] = await Promise.all([
      apiClient.get<{ data: RawEnrollment[] }>(
        `${BASE}/offering/${offeringId}`,
        AUTH
      ),
      buildLookups(),
    ])
    return res.data.map((r) => mapEnrollment(r, offeringsById, studentsById))
  },

  // Rejects on duplicate enrollment, closed offering, capacity, registration
  // window, or unmet prerequisites — all enforced server-side (409/400).
  async create(dto: CreateEnrollmentDto): Promise<EnrollmentRecord> {
    const [res, { offeringsById, studentsById }] = await Promise.all([
      apiClient.post<{ data: RawEnrollment }>(BASE, dto, AUTH),
      buildLookups(),
    ])
    return mapEnrollment(res.data, offeringsById, studentsById)
  },

  async bulkCreate(dto: BulkEnrollDto): Promise<BulkEnrollResult> {
    return apiClient.post<BulkEnrollResult>(`${BASE}/bulk`, dto, AUTH)
  },

  // Student-facing multi-course registration. `POST /enrollments/bulk` is
  // Admin-only (enrollment_README.md), so a student picking several offerings
  // fans out to the self-allowed `POST /enrollments`, one per offering, and
  // reports per-offering outcomes in the same shape `bulkCreate` returns.
  // Each offering carries its own `semesterId`. Independent requests: one
  // rejection (duplicate, full, window closed) doesn't sink the others.
  async selfEnrollMany(
    studentId: number,
    items: { offeringId: number; semesterId: number }[]
  ): Promise<BulkEnrollResult> {
    const settled = await Promise.allSettled(
      items.map((it) =>
        enrollmentApi.create({
          studentId,
          offeringId: it.offeringId,
          semesterId: it.semesterId,
        })
      )
    )
    const enrolled: BulkEnrollResult["enrolled"] = []
    const errors: BulkEnrollResult["errors"] = []
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        enrolled.push({
          id: r.value.id,
          offeringId: items[i].offeringId,
          status: r.value.status,
        })
      } else {
        const reason = r.reason as { message?: string } | undefined
        errors.push({
          offeringId: items[i].offeringId,
          message: reason?.message ?? "Enrollment failed.",
        })
      }
    })
    return { enrolled, errors }
  },

  // Server decides DROPPED (within registration window, no penalty) vs
  // WITHDRAWN (after window, transcript-visible) — the frontend just calls
  // this one endpoint and reflects whichever status comes back.
  async drop(
    id: number,
    dto: DropEnrollmentDto = {}
  ): Promise<DropEnrollmentResult> {
    return apiClient.patch<DropEnrollmentResult, DropEnrollmentDto>(
      `${BASE}/${id}/drop`,
      dto,
      AUTH
    )
  },

  // Mints a one-time Moodle SSO login URL for this enrolled course offering
  // — see sandbox/schema-moodel-sync-refactor/api-v2.md §"Course Launch
  // (SSO)". Supersedes the earlier `moodle-sync/courses/my` +
  // `moodle-sync/sso/launch` proposal (see MISSING_BACKEND_APIS.md §2.15):
  // the course list itself is already covered by `getByStudent` above, so
  // only the launch step needed a real endpoint. The backend rejects with
  // 409 if the student, the course, or the enrollment itself isn't yet
  // Moodle-synced — callers surface that rather than pre-guessing
  // readiness from a sync-status flag.
  async launchMoodleCourse(offeringId: number): Promise<MoodleLaunchResult> {
    return apiClient.get<MoodleLaunchResult>(
      `/students/me/courses/${offeringId}/launch`,
      AUTH
    )
  },

  // GET /students/me/courses — Student. The self-scoped course list (no
  // studentId needed), api-v2.md §"Student Results & Courses". Carries the
  // per-course `moodleSynced` flag that `/enrollments/student/:id` doesn't.
  // Rows are minimal ({ offeringId, course:{code,title}, semester,
  // moodleSynced }) — read defensively; the richer display data still comes
  // from getByStudent, this just layers the sync flag on top.
  async getMyCourses(): Promise<MyCourseSummary[]> {
    const res = await apiClient.get<{
      data: {
        offeringId: number
        course?: { code?: string | null; title?: string | null } | null
        semester?: string | null
        moodleSynced?: boolean | null
      }[]
    }>("/students/me/courses", AUTH)
    return (res.data ?? []).map((r) => ({
      offeringId: r.offeringId,
      courseCode: r.course?.code ?? "",
      courseTitle: r.course?.title ?? "",
      semester: r.semester ?? null,
      moodleSynced: r.moodleSynced ?? false,
    }))
  },

  // ── Attendance ──────────────────────────────────────────────────────────

  async recordAttendance(dto: RecordAttendanceDto): Promise<AttendanceRecord> {
    const [res, { studentsById }] = await Promise.all([
      apiClient.post<{ data: RawAttendance }>(`${BASE}/attendance`, dto, AUTH),
      buildLookups(),
    ])
    return mapAttendance(res.data, studentsById)
  },

  async bulkRecordAttendance(
    dto: BulkAttendanceDto
  ): Promise<BulkAttendanceResult> {
    return apiClient.post<BulkAttendanceResult>(
      `${BASE}/attendance/bulk`,
      dto,
      AUTH
    )
  },

  async getAttendanceBySchedule(
    scheduleId: number,
    attendanceDate?: string
  ): Promise<AttendanceRecord[]> {
    const [res, { studentsById }] = await Promise.all([
      apiClient.get<{ data: RawAttendance[] }>(
        `${BASE}/attendance/schedule/${scheduleId}`,
        {
          ...AUTH,
          params: { attendanceDate },
        }
      ),
      buildLookups(),
    ])
    return res.data.map((r) => mapAttendance(r, studentsById))
  },

  async getAttendanceByStudent(studentId: number): Promise<AttendanceRecord[]> {
    const [res, { studentsById }] = await Promise.all([
      apiClient.get<{ data: RawAttendance[] }>(
        `${BASE}/attendance/student/${studentId}`,
        AUTH
      ),
      buildLookups(),
    ])
    return res.data.map((r) => mapAttendance(r, studentsById))
  },

  async updateAttendance(
    id: number,
    dto: UpdateAttendanceDto
  ): Promise<AttendanceRecord> {
    const [res, { studentsById }] = await Promise.all([
      apiClient.patch<{ data: RawAttendance }, UpdateAttendanceDto>(
        `${BASE}/attendance/${id}`,
        dto,
        AUTH
      ),
      buildLookups(),
    ])
    return mapAttendance(res.data, studentsById)
  },

  // No dedicated aggregate/percentage endpoint exists (see
  // sandbox/enrollment/enrollment_workflow.md §6 for the formula this
  // mirrors) — composed client-side from three already-real sources: this
  // student's enrollments, this offering's weekly schedules (Timetable),
  // and this student's attendance rows, matching present+late as "attended"
  // over every session recorded.
  async getAttendanceSummary(studentId: number): Promise<AttendanceSummary[]> {
    const [enrollments, attendance] = await Promise.all([
      enrollmentApi.getByStudent(studentId, { status: "ENROLLED" }),
      enrollmentApi.getAttendanceByStudent(studentId),
    ])

    const schedulesByOffering = await Promise.all(
      enrollments.map((e) =>
        timetableService.getSchedulesByOffering(e.offeringId).catch(() => [])
      )
    )

    return enrollments.map((enrollment, i) => {
      const scheduleIds = new Set(schedulesByOffering[i].map((s) => s.id))
      const rows = attendance.filter((a) => scheduleIds.has(a.scheduleId))
      const present = rows.filter((r) => r.status === "present").length
      const late = rows.filter((r) => r.status === "late").length
      const absent = rows.filter((r) => r.status === "absent").length
      const excused = rows.filter((r) => r.status === "excused").length
      const total = rows.length
      return {
        offeringId: enrollment.offeringId,
        courseCode: enrollment.courseCode,
        courseTitle: enrollment.courseTitle,
        totalSessions: total,
        present,
        late,
        absent,
        excused,
        attendedPercent:
          total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0,
      }
    })
  },
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const enrollmentKeys = {
  all: ["enrollment"] as const,
  list: (filters?: Partial<EnrollmentFilter>) =>
    [...enrollmentKeys.all, "list", filters] as const,
  detail: (id: number) => [...enrollmentKeys.all, "detail", id] as const,
  byStudent: (studentId: number, params?: object) =>
    [...enrollmentKeys.all, "student", studentId, params] as const,
  byOffering: (offeringId: number) =>
    [...enrollmentKeys.all, "offering", offeringId] as const,
  myCourses: () => [...enrollmentKeys.all, "my-courses"] as const,
  attendanceBySchedule: (scheduleId: number, date?: string) =>
    [
      ...enrollmentKeys.all,
      "attendance",
      "schedule",
      scheduleId,
      date,
    ] as const,
  attendanceByStudent: (studentId: number) =>
    [...enrollmentKeys.all, "attendance", "student", studentId] as const,
  attendanceSummary: (studentId: number) =>
    [...enrollmentKeys.all, "attendance", "summary", studentId] as const,
}

// ── Query options ─────────────────────────────────────────────────────────────

export const enrollmentQueryOptions = {
  list: (filters?: Partial<EnrollmentFilter>) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.list(filters),
      queryFn: () => enrollmentApi.list(filters),
    }),
  detail: (id: number) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.detail(id),
      queryFn: () => enrollmentApi.getById(id),
    }),
  byStudent: (
    studentId: number,
    params?: { semesterId?: number; status?: EnrollmentStatus }
  ) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.byStudent(studentId, params),
      queryFn: () => enrollmentApi.getByStudent(studentId, params),
    }),
  byOffering: (offeringId: number) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.byOffering(offeringId),
      queryFn: () => enrollmentApi.getByOffering(offeringId),
    }),
  myCourses: () =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.myCourses(),
      queryFn: () => enrollmentApi.getMyCourses(),
      // Speculative — 404s until the backend ships it; the page falls back
      // to the studentId-scoped list, so don't hammer on failure.
      retry: false,
      staleTime: 5 * 60 * 1000,
    }),
  attendanceBySchedule: (scheduleId: number, attendanceDate?: string) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.attendanceBySchedule(scheduleId, attendanceDate),
      queryFn: () =>
        enrollmentApi.getAttendanceBySchedule(scheduleId, attendanceDate),
    }),
  attendanceByStudent: (studentId: number) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.attendanceByStudent(studentId),
      queryFn: () => enrollmentApi.getAttendanceByStudent(studentId),
    }),
  attendanceSummary: (studentId: number) =>
    createApiQueryOptions({
      queryKey: enrollmentKeys.attendanceSummary(studentId),
      queryFn: () => enrollmentApi.getAttendanceSummary(studentId),
    }),
}

// ── Mutation options ──────────────────────────────────────────────────────────

export const enrollmentMutationOptions = {
  create: () =>
    createApiMutationOptions<EnrollmentRecord, CreateEnrollmentDto>({
      mutationKey: [...enrollmentKeys.all, "create"],
      mutationFn: (dto) => enrollmentApi.create(dto),
    }),
  bulkCreate: () =>
    createApiMutationOptions<BulkEnrollResult, BulkEnrollDto>({
      mutationKey: [...enrollmentKeys.all, "bulk-create"],
      mutationFn: (dto) => enrollmentApi.bulkCreate(dto),
    }),
  selfEnrollMany: () =>
    createApiMutationOptions<
      BulkEnrollResult,
      { studentId: number; items: { offeringId: number; semesterId: number }[] }
    >({
      mutationKey: [...enrollmentKeys.all, "self-enroll-many"],
      mutationFn: ({ studentId, items }) =>
        enrollmentApi.selfEnrollMany(studentId, items),
    }),
  drop: () =>
    createApiMutationOptions<
      DropEnrollmentResult,
      { id: number; dto?: DropEnrollmentDto }
    >({
      mutationKey: [...enrollmentKeys.all, "drop"],
      mutationFn: ({ id, dto }) => enrollmentApi.drop(id, dto),
    }),
  launchMoodleCourse: () =>
    createApiMutationOptions<MoodleLaunchResult, number>({
      mutationKey: [...enrollmentKeys.all, "launch-moodle-course"],
      mutationFn: (offeringId) => enrollmentApi.launchMoodleCourse(offeringId),
    }),
  recordAttendance: () =>
    createApiMutationOptions<AttendanceRecord, RecordAttendanceDto>({
      mutationKey: [...enrollmentKeys.all, "record-attendance"],
      mutationFn: (dto) => enrollmentApi.recordAttendance(dto),
    }),
  bulkRecordAttendance: () =>
    createApiMutationOptions<BulkAttendanceResult, BulkAttendanceDto>({
      mutationKey: [...enrollmentKeys.all, "bulk-record-attendance"],
      mutationFn: (dto) => enrollmentApi.bulkRecordAttendance(dto),
    }),
  updateAttendance: () =>
    createApiMutationOptions<
      AttendanceRecord,
      { id: number; dto: UpdateAttendanceDto }
    >({
      mutationKey: [...enrollmentKeys.all, "update-attendance"],
      mutationFn: ({ id, dto }) => enrollmentApi.updateAttendance(id, dto),
    }),
}
