// ─── Timetable Service ──────────────────────────────────────────────────────
//
// Real backend contract per bruno/timetable/*.bru and sandbox/timetable/
// timetable_README.md (source of truth — see CLAUDE.md §13). This module's
// `/timetable/schedules` surface was chosen as canonical for ClassSchedule
// CRUD over the Course module's `/courses/offerings/:id/schedules` (which
// courseOfferingApi.ts already uses) because it's the richer, more detailed
// contract (conflict detection, caching, role guards) — see
// MISSING_BACKEND_APIS.md for the flagged duplication; the two are NOT
// reconciled backend-side yet, so the same ClassSchedule row could in theory
// be reached through either path.
//
// None of the bruno files for this module show an example response body
// (only request shapes + prose docs), so two things are assumed rather than
// confirmed:
//   1. Response envelope — treated as `{data: ...}` for GETs and mutations,
//      matching every other integrated module's convention this session.
//   2. Whether a schedule row nests `offering`/`lecturer` relations or just
//      returns raw FK ids. courseOfferingApi.ts's confirmed contract for the
//      *identical* ClassSchedule table (via /courses/offerings/:id/schedules)
//      returns it FLAT (offeringId/lecturerId scalars only) — so the mapper
//      below reads nested relations defensively when present, but falls back
//      to a client-side join against already-fetched Course Offerings +
//      Tutors lists when they're absent. This costs two extra (cheap,
//      cached) requests per timetable fetch but is correct either way.
//
// This frontend keeps "tutor" naming (tutorId/tutorName) throughout, matching
// this app's established UserRole.TUTOR / usersApi.listTutors() convention —
// the wire's `lecturerId` field is mapped to/from it here, the same
// translation pattern used by every other module's service layer.

import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import { dedupeAsync } from "@/lib/utils/dedupe-async"
import { canAny } from "@/lib/permissions/can"
import { offeringsApi } from "@/services/courseOfferingApi"
import { usersApi } from "@/services/usersApi"
import type { CourseOffering } from "@/types/school"
import type { Tutor } from "@/types/users"
import type {
  AcademicCalendarEvent,
  AcademicCalendarMeta,
  AcademicSessionDetail,
  CalendarEvent,
  CalendarEventFilter,
  CreateScheduleDto,
  DayOfWeek,
  PaginatedResponse,
  ScheduleFilter,
  Semester,
  TimetableGrouped,
  TimetableSlot,
  UpdateScheduleDto,
  VenueAvailability,
} from "../types/timetable.types"

const AUTH = { access_token: true } as const

// ── Sort helper ───────────────────────────────────────────────────────────────

const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]

function sortByDay(slots: TimetableSlot[]): TimetableSlot[] {
  return [...slots].sort(
    (a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)
  )
}

function groupByDay(slots: TimetableSlot[]): TimetableGrouped {
  const grouped: TimetableGrouped = {}
  for (const slot of slots) {
    if (!grouped[slot.dayOfWeek]) grouped[slot.dayOfWeek] = []
    grouped[slot.dayOfWeek]!.push(slot)
  }
  for (const day of DAY_ORDER) {
    if (grouped[day])
      grouped[day]!.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }
  return grouped
}

// ── Raw shape + defensive mapping (see file header for the nested-vs-flat note) ──

interface RawScheduleRelations {
  id: number
  offeringId: number
  lecturerId: number
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  venue: string
  classType: TimetableSlot["classType"]
  offering?: {
    course?: { code?: string; title?: string; creditUnits?: number }
  }
  lecturer?: { user?: { firstName?: string | null; lastName?: string | null } }
}

// Shared offering/tutor name lookups, reused by every mapper below — a list
// of N slots costs 2 extra requests, not 2N.
//
// - `dedupeAsync` collapses the burst of identical calls the student
//   dashboard makes (my-timetable + tutor-timetable + calendar all build
//   these) into one fetch + a short-lived result — plain `apiClient` calls
//   React Query can't dedupe on its own.
// - the tutor list is only fetched for users who can actually view it
//   (`tutors.view`/`manage`); for a student viewing their own timetable it
//   would just 403. `mapSlot` prefers the schedule response's own nested
//   `lecturer.user` / `offering.course` fields either way.
const buildLookups = dedupeAsync(
  async (): Promise<{
    offeringsById: Map<number, CourseOffering>
    tutorsById: Map<number, Tutor>
  }> => {
    const canListTutors = canAny([
      ["tutors", "view"],
      ["tutors", "manage"],
    ])
    const [offeringsRes, tutorsRes] = await Promise.all([
      offeringsApi.listShared().catch(() => ({ data: [] as CourseOffering[] })),
      canListTutors
        ? usersApi.listTutors().catch(() => ({ data: [] as Tutor[], total: 0 }))
        : Promise.resolve({ data: [] as Tutor[], total: 0 }),
    ])
    return {
      offeringsById: new Map(offeringsRes.data.map((o) => [o.id, o])),
      tutorsById: new Map(tutorsRes.data.map((t) => [t.id, t])),
    }
  }
)

function mapSlot(
  raw: RawScheduleRelations,
  offeringsById: Map<number, CourseOffering>,
  tutorsById: Map<number, Tutor>
): TimetableSlot {
  const offering = offeringsById.get(raw.offeringId)
  const tutor = tutorsById.get(raw.lecturerId)
  const tutorName = raw.lecturer?.user
    ? `${raw.lecturer.user.firstName ?? ""} ${raw.lecturer.user.lastName ?? ""}`.trim()
    : tutor
      ? `${tutor.user.first_name ?? ""} ${tutor.user.last_name ?? ""}`.trim()
      : ""
  return {
    id: raw.id,
    dayOfWeek: raw.dayOfWeek,
    startTime: raw.startTime,
    endTime: raw.endTime,
    venue: raw.venue,
    classType: raw.classType,
    courseCode: raw.offering?.course?.code ?? offering?.course_code ?? "—",
    courseTitle: raw.offering?.course?.title ?? offering?.course_title ?? "—",
    creditUnits:
      raw.offering?.course?.creditUnits ?? offering?.credit_units ?? 0,
    tutorId: raw.lecturerId,
    tutorName: tutorName || "—",
    offeringId: raw.offeringId,
  }
}

// ── timetableService ──────────────────────────────────────────────────────────

export const timetableService = {
  // Role-aware: resolves the CURRENT user's own timetable server-side
  // (student → enrolled courses, tutor → assigned offerings). Works for
  // both roles — the Tutor "My Teaching Schedule" page uses this too,
  // rather than a separate per-lecturer-id call.
  async getMyTimetable(
    params: { semesterId?: number; groupByDay?: boolean } = {}
  ): Promise<TimetableSlot[] | TimetableGrouped> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>("/timetable/my", {
        ...AUTH,
        params,
      }),
      buildLookups(),
    ])
    const slots = res.data.map((r) => mapSlot(r, offeringsById, tutorsById))
    return params.groupByDay ? groupByDay(slots) : sortByDay(slots)
  },

  // Admin/Staff: an arbitrary lecturer's timetable view.
  async getTutorTimetable(
    tutorId: number,
    params: { semesterId?: number } = {}
  ): Promise<TimetableSlot[]> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>(
        `/timetable/lecturer/${tutorId}`,
        { ...AUTH, params }
      ),
      buildLookups(),
    ])
    return sortByDay(res.data.map((r) => mapSlot(r, offeringsById, tutorsById)))
  },

  // Admin/Staff: an arbitrary student's timetable view.
  async getStudentTimetable(
    studentId: number,
    params: { semesterId?: number } = {}
  ): Promise<TimetableSlot[]> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>(
        `/timetable/student/${studentId}`,
        { ...AUTH, params }
      ),
      buildLookups(),
    ])
    return sortByDay(res.data.map((r) => mapSlot(r, offeringsById, tutorsById)))
  },

  // Admin schedule management — full CRUD over /timetable/schedules.
  async getAllSchedules(
    filters: ScheduleFilter = {}
  ): Promise<PaginatedResponse<TimetableSlot>> {
    const params: Record<string, unknown> = {
      semesterId: filters.semesterId,
      offeringId: filters.offeringId,
      lecturerId: filters.tutorId,
      dayOfWeek: filters.dayOfWeek,
      venue: filters.venue,
      classType: filters.classType,
      // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md
      // A35. Sent ahead of the backend per CLAUDE.md §14. Send-only:
      // TimetableSlot carries no program-derivable field (courseCode/
      // courseTitle/offeringId only), so there's nothing to filter
      // client-side without an extra offering->program lookup per row —
      // not built here rather than faked.
      majorProgramId: filters.majorProgramId,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    }
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{
        data: RawScheduleRelations[]
        meta: { total: number; page: number; limit: number }
      }>("/timetable/schedules", { ...AUTH, params }),
      buildLookups(),
    ])
    const data = sortByDay(
      res.data.map((r) => mapSlot(r, offeringsById, tutorsById))
    )
    return {
      data,
      meta: {
        total: res.meta.total,
        page: res.meta.page,
        limit: res.meta.limit,
        totalPages: Math.max(1, Math.ceil(res.meta.total / res.meta.limit)),
      },
    }
  },

  // Dedicated path-param reads — `/timetable/schedules/{lecturer,semester}/:id`.
  // Equivalent to `getAllSchedules({ tutorId })` / `({ semesterId })` but
  // lighter (no pagination envelope) and what the admin timetable filter bar
  // uses when scoped to one lecturer or semester.
  async getSchedulesByLecturer(lecturerId: number): Promise<TimetableSlot[]> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>(
        `/timetable/schedules/lecturer/${lecturerId}`,
        AUTH
      ),
      buildLookups(),
    ])
    return sortByDay(res.data.map((r) => mapSlot(r, offeringsById, tutorsById)))
  },

  async getSchedulesBySemester(semesterId: number): Promise<TimetableSlot[]> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>(
        `/timetable/schedules/semester/${semesterId}`,
        AUTH
      ),
      buildLookups(),
    ])
    return sortByDay(res.data.map((r) => mapSlot(r, offeringsById, tutorsById)))
  },

  async getScheduleById(id: number): Promise<TimetableSlot> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations }>(
        `/timetable/schedules/${id}`,
        AUTH
      ),
      buildLookups(),
    ])
    return mapSlot(res.data, offeringsById, tutorsById)
  },

  async getSchedulesByOffering(offeringId: number): Promise<TimetableSlot[]> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.get<{ data: RawScheduleRelations[] }>(
        `/timetable/schedules/offering/${offeringId}`,
        AUTH
      ),
      buildLookups(),
    ])
    return res.data.map((r) => mapSlot(r, offeringsById, tutorsById))
  },

  // Rejects venue/lecturer time conflicts with a 409 per the bruno docs —
  // callers should surface ApiClientError.status === 409 as a conflict
  // message rather than a generic failure.
  async createSchedule(dto: CreateScheduleDto): Promise<TimetableSlot> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.post<{ data: RawScheduleRelations }>(
        "/timetable/schedules",
        {
          offeringId: dto.offeringId,
          lecturerId: dto.tutorId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          venue: dto.venue,
          classType: dto.classType,
        },
        AUTH
      ),
      buildLookups(),
    ])
    return mapSlot(res.data, offeringsById, tutorsById)
  },

  async updateSchedule(
    id: number,
    dto: UpdateScheduleDto
  ): Promise<TimetableSlot> {
    const [res, { offeringsById, tutorsById }] = await Promise.all([
      apiClient.put<{ data: RawScheduleRelations }>(
        `/timetable/schedules/${id}`,
        {
          offeringId: dto.offeringId,
          lecturerId: dto.tutorId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          venue: dto.venue,
          classType: dto.classType,
        },
        AUTH
      ),
      buildLookups(),
    ])
    return mapSlot(res.data, offeringsById, tutorsById)
  },

  async deleteSchedule(id: number): Promise<{ message: string }> {
    await apiClient.delete<void>(`/timetable/schedules/${id}`, AUTH)
    return { message: "Schedule deleted." }
  },

  // Moved 2026-09-14 (Exam Timetable) — /timetable/venues is now the
  // capacity-aware Venue entity's own CRUD (see exam-timetable.service.ts);
  // this free-text ClassSchedule.venue name autocomplete moved to
  // /timetable/venues/names to make room for it (bruno/timetable/
  // Venues - List.bru).
  async getVenues(semesterId?: number): Promise<string[]> {
    const res = await apiClient.get<{ data: string[] }>(
      "/timetable/venues/names",
      {
        ...AUTH,
        params: { semesterId },
      }
    )
    return res.data
  },

  async getVenueAvailability(params: {
    venue: string
    dayOfWeek: DayOfWeek
    semesterId: number
    excludeScheduleId?: number
  }): Promise<VenueAvailability> {
    const res = await apiClient.get<{ data: VenueAvailability }>(
      "/timetable/venue-availability",
      {
        ...AUTH,
        params,
      }
    )
    return res.data
  },
}

// ── calendarService ───────────────────────────────────────────────────────────
// Real, per bruno/timetable/Calendar Events - *.bru. Moodle-sourced,
// read-only aside from the visibility toggle. `offeringId` (not
// `courseOfferingId`) is the real query-param name per bruno.

interface RawCalendarEvent {
  id: number
  eventType: CalendarEvent["eventType"]
  name: string
  description: string | null
  startDate: string
  endDate: string | null
  meetingUrl: string | null
  isVisible: boolean
  offeringId?: number | null
  offering?: { course?: { code?: string; title?: string } }
}

function mapCalendarEvent(
  raw: RawCalendarEvent,
  offeringsById: Map<number, CourseOffering>
): CalendarEvent {
  const offering =
    raw.offeringId != null ? offeringsById.get(raw.offeringId) : undefined
  return {
    id: raw.id,
    eventType: raw.eventType,
    name: raw.name,
    description: raw.description,
    startDate: raw.startDate,
    endDate: raw.endDate,
    meetingUrl: raw.meetingUrl,
    isVisible: raw.isVisible,
    courseCode: raw.offering?.course?.code ?? offering?.course_code,
    courseTitle: raw.offering?.course?.title ?? offering?.course_title,
  }
}

export const calendarService = {
  async getMyEvents(
    params: CalendarEventFilter = {}
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{
        data: RawCalendarEvent[]
        meta: { total: number; page: number; limit: number }
      }>("/calendar/events/my", {
        ...AUTH,
        params: { days: params.days, page: params.page, limit: params.limit },
      }),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    const data = res.data.map((e) => mapCalendarEvent(e, offeringsById))
    return {
      data,
      meta: {
        total: res.meta.total,
        page: res.meta.page,
        limit: res.meta.limit,
        totalPages: Math.max(1, Math.ceil(res.meta.total / res.meta.limit)),
      },
    }
  },

  async getMyUpcomingEvents(): Promise<CalendarEvent[]> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{ data: RawCalendarEvent[] }>(
        "/calendar/events/my/upcoming",
        AUTH
      ),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    return res.data.map((e) => mapCalendarEvent(e, offeringsById))
  },

  async getUpcomingEvents(days = 14): Promise<CalendarEvent[]> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{ data: RawCalendarEvent[] }>("/calendar/events/upcoming", {
        ...AUTH,
        params: { days },
      }),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    return res.data.map((e) => mapCalendarEvent(e, offeringsById))
  },

  async getAllEvents(
    filters: CalendarEventFilter = {}
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{
        data: RawCalendarEvent[]
        meta: { total: number; page: number; limit: number }
      }>("/calendar/events", {
        ...AUTH,
        params: {
          eventType: filters.eventType,
          offeringId: filters.courseOfferingId,
          isVisible: filters.isVisible,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        },
      }),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    const data = res.data.map((e) => mapCalendarEvent(e, offeringsById))
    return {
      data,
      meta: {
        total: res.meta.total,
        page: res.meta.page,
        limit: res.meta.limit,
        totalPages: Math.max(1, Math.ceil(res.meta.total / res.meta.limit)),
      },
    }
  },

  async getEventById(id: number): Promise<CalendarEvent> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{ data: RawCalendarEvent }>(`/calendar/events/${id}`, AUTH),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    return mapCalendarEvent(res.data, offeringsById)
  },

  // GET /calendar/events/course/:offeringId — Student, Tutor, Admin. Every
  // event linked to one course offering. Same row shape as the other event
  // lists, so it reuses mapCalendarEvent.
  async getEventsByCourse(offeringId: number): Promise<CalendarEvent[]> {
    const [res, offerings] = await Promise.all([
      apiClient.get<{ data: RawCalendarEvent[] }>(
        `/calendar/events/course/${offeringId}`,
        AUTH
      ),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    return res.data.map((e) => mapCalendarEvent(e, offeringsById))
  },

  async toggleEventVisibility(id: number): Promise<CalendarEvent> {
    const [res, offerings] = await Promise.all([
      apiClient.patch<{ data: RawCalendarEvent }>(
        `/calendar/events/${id}/visibility`,
        undefined,
        AUTH
      ),
      offeringsApi.listShared(),
    ])
    const offeringsById = new Map(offerings.data.map((o) => [o.id, o]))
    return mapCalendarEvent(res.data, offeringsById)
  },
}

// ── academicCalendarService ────────────────────────────────────────────────────

// Structurally-valid empty state — no session configured yet (a fresh/
// clean environment) rather than an error. React Query rejects `undefined`
// as query data outright ("Query data cannot be undefined"), so a response
// body that omits `data` (as opposed to sending `data: null`) must still
// resolve to something concrete, not fall through to `undefined`.
const EMPTY_ACADEMIC_CALENDAR: AcademicCalendarMeta = {
  session: { id: 0, name: "—", startDate: "", endDate: "" },
  semesters: [],
  currentSemester: null,
}

export const academicCalendarService = {
  async getCurrent(): Promise<AcademicCalendarMeta> {
    const res = await apiClient.get<{ data?: AcademicCalendarMeta | null }>(
      "/academic-calendar",
      AUTH
    )
    return res.data ?? EMPTY_ACADEMIC_CALENDAR
  },

  async getActiveSemester(): Promise<Semester | null> {
    const res = await apiClient.get<{ data?: Semester | null }>(
      "/academic-calendar/semesters/active",
      AUTH
    )
    return res.data ?? null
  },

  async getActiveSession(): Promise<{ id: number; name: string } | null> {
    const res = await apiClient.get<{
      data?: { id: number; name: string } | null
    }>("/academic-calendar/sessions/active", AUTH)
    return res.data ?? null
  },

  async getSessions(): Promise<{ id: number; name: string }[]> {
    const res = await apiClient.get<{ data: { id: number; name: string }[] }>(
      "/academic-calendar/sessions",
      { ...AUTH, params: { limit: 50 } }
    )
    return res.data
  },

  // GET /academic-calendar/sessions/:id — one session with all its semesters.
  async getSessionById(id: number): Promise<AcademicSessionDetail> {
    const res = await apiClient.get<{ data: AcademicSessionDetail }>(
      `/academic-calendar/sessions/${id}`,
      AUTH
    )
    return res.data
  },

  // GET /academic-calendar/events — portal-side calendar announcements
  // (Announcement rows, category "event"). Any authenticated user.
  async getEvents(
    params: { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<AcademicCalendarEvent>> {
    const res = await apiClient.get<{
      data: AcademicCalendarEvent[]
      meta?: { total: number; page: number; limit: number }
    }>("/academic-calendar/events", {
      ...AUTH,
      params: { page: params.page ?? 1, limit: params.limit ?? 20 },
    })
    const limit = res.meta?.limit ?? params.limit ?? 20
    const total = res.meta?.total ?? res.data.length
    return {
      data: res.data,
      meta: {
        total,
        page: res.meta?.page ?? 1,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  },
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const timetableKeys = {
  all: ["timetable"] as const,
  my: (params?: object) => ["timetable", "my", params] as const,
  student: (id: number, params?: object) =>
    ["timetable", "student", id, params] as const,
  tutor: (id: number, params?: object) =>
    ["timetable", "tutor", id, params] as const,
  byOffering: (offeringId: number) =>
    ["timetable", "offering", offeringId] as const,
  schedulesByLecturer: (lecturerId: number) =>
    ["timetable", "schedules", "lecturer", lecturerId] as const,
  schedulesBySemester: (semesterId: number) =>
    ["timetable", "schedules", "semester", semesterId] as const,
  admin: (filters?: object) => ["timetable", "admin", filters] as const,
  detail: (id: number) => ["timetable", "detail", id] as const,
  venues: (semesterId?: number) => ["timetable", "venues", semesterId] as const,
  venueAvail: (params?: object) =>
    ["timetable", "venue-availability", params] as const,
}

export const calendarKeys = {
  all: ["calendar"] as const,
  my: (params?: object) => ["calendar", "my", params] as const,
  myUpcoming: () => ["calendar", "my-upcoming"] as const,
  upcoming: (days?: number) => ["calendar", "upcoming", days] as const,
  admin: (filters?: object) => ["calendar", "admin", filters] as const,
  byId: (id: number) => ["calendar", "events", id] as const,
  byCourse: (offeringId: number) =>
    ["calendar", "events", "course", offeringId] as const,
}

export const academicCalendarKeys = {
  current: () => ["academic-calendar", "current"] as const,
  activeSemester: () => ["academic-calendar", "active-semester"] as const,
  activeSession: () => ["academic-calendar", "active-session"] as const,
  sessions: () => ["academic-calendar", "sessions"] as const,
  sessionDetail: (id: number) => ["academic-calendar", "sessions", id] as const,
  events: (params?: object) => ["academic-calendar", "events", params] as const,
}

// ── Query options ─────────────────────────────────────────────────────────────

export const timetableQueryOptions = {
  my: (params?: { semesterId?: number; groupByDay?: boolean }) =>
    createApiQueryOptions({
      queryKey: timetableKeys.my(params),
      queryFn: () => timetableService.getMyTimetable(params),
    }),

  tutor: (tutorId: number, params?: { semesterId?: number }) =>
    createApiQueryOptions({
      queryKey: timetableKeys.tutor(tutorId, params),
      queryFn: () => timetableService.getTutorTimetable(tutorId, params),
    }),

  student: (studentId: number, params?: { semesterId?: number }) =>
    createApiQueryOptions({
      queryKey: timetableKeys.student(studentId, params),
      queryFn: () => timetableService.getStudentTimetable(studentId, params),
    }),

  admin: (filters?: ScheduleFilter) =>
    createApiQueryOptions({
      queryKey: timetableKeys.admin(filters),
      queryFn: () => timetableService.getAllSchedules(filters),
    }),

  detail: (id: number) =>
    createApiQueryOptions({
      queryKey: timetableKeys.detail(id),
      queryFn: () => timetableService.getScheduleById(id),
    }),

  byOffering: (offeringId: number) =>
    createApiQueryOptions({
      queryKey: timetableKeys.byOffering(offeringId),
      queryFn: () => timetableService.getSchedulesByOffering(offeringId),
    }),

  schedulesByLecturer: (lecturerId: number) =>
    createApiQueryOptions({
      queryKey: timetableKeys.schedulesByLecturer(lecturerId),
      queryFn: () => timetableService.getSchedulesByLecturer(lecturerId),
    }),

  schedulesBySemester: (semesterId: number) =>
    createApiQueryOptions({
      queryKey: timetableKeys.schedulesBySemester(semesterId),
      queryFn: () => timetableService.getSchedulesBySemester(semesterId),
    }),

  venues: (semesterId?: number) =>
    createApiQueryOptions({
      queryKey: timetableKeys.venues(semesterId),
      queryFn: () => timetableService.getVenues(semesterId),
    }),

  venueAvailability: (params: {
    venue: string
    dayOfWeek: DayOfWeek
    semesterId: number
    excludeScheduleId?: number
  }) =>
    createApiQueryOptions({
      queryKey: timetableKeys.venueAvail(params),
      queryFn: () => timetableService.getVenueAvailability(params),
    }),
}

export const calendarQueryOptions = {
  my: (params?: CalendarEventFilter) =>
    createApiQueryOptions({
      queryKey: calendarKeys.my(params),
      queryFn: () => calendarService.getMyEvents(params),
    }),

  myUpcoming: () =>
    createApiQueryOptions({
      queryKey: calendarKeys.myUpcoming(),
      queryFn: () => calendarService.getMyUpcomingEvents(),
    }),

  upcoming: (days?: number) =>
    createApiQueryOptions({
      queryKey: calendarKeys.upcoming(days),
      queryFn: () => calendarService.getUpcomingEvents(days),
    }),

  admin: (filters?: CalendarEventFilter) =>
    createApiQueryOptions({
      queryKey: calendarKeys.admin(filters),
      queryFn: () => calendarService.getAllEvents(filters),
    }),

  byId: (id: number) =>
    createApiQueryOptions({
      queryKey: calendarKeys.byId(id),
      queryFn: () => calendarService.getEventById(id),
    }),

  byCourse: (offeringId: number) =>
    createApiQueryOptions({
      queryKey: calendarKeys.byCourse(offeringId),
      queryFn: () => calendarService.getEventsByCourse(offeringId),
    }),
}

export const academicCalendarQueryOptions = {
  current: () =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.current(),
      queryFn: () => academicCalendarService.getCurrent(),
    }),

  activeSemester: () =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.activeSemester(),
      queryFn: () => academicCalendarService.getActiveSemester(),
    }),

  activeSession: () =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.activeSession(),
      queryFn: () => academicCalendarService.getActiveSession(),
    }),

  sessions: () =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.sessions(),
      queryFn: () => academicCalendarService.getSessions(),
    }),

  sessionDetail: (id: number) =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.sessionDetail(id),
      queryFn: () => academicCalendarService.getSessionById(id),
    }),

  events: (params?: { page?: number; limit?: number }) =>
    createApiQueryOptions({
      queryKey: academicCalendarKeys.events(params),
      queryFn: () => academicCalendarService.getEvents(params),
    }),
}

// ── Mutation options ──────────────────────────────────────────────────────────

export const timetableMutationOptions = {
  create: () =>
    createApiMutationOptions<TimetableSlot, CreateScheduleDto>({
      mutationFn: (dto) => timetableService.createSchedule(dto),
    }),

  update: () =>
    createApiMutationOptions<
      TimetableSlot,
      { id: number; dto: UpdateScheduleDto }
    >({
      mutationFn: ({ id, dto }) => timetableService.updateSchedule(id, dto),
    }),

  delete: () =>
    createApiMutationOptions<{ message: string }, number>({
      mutationFn: (id) => timetableService.deleteSchedule(id),
    }),
}

export const calendarMutationOptions = {
  toggleVisibility: () =>
    createApiMutationOptions<CalendarEvent, number>({
      mutationFn: (id) => calendarService.toggleEventVisibility(id),
    }),
}
