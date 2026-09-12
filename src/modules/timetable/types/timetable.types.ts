import type { z } from "zod"
import type {
  CreateScheduleSchema,
  UpdateScheduleSchema,
  ScheduleFilterSchema,
} from "../schemas/schedule.schema"
import type { CalendarEventFilterSchema } from "../schemas/calendar-event.schema"

// ── Inferred from schemas ──────────────────────────────────────────────────────

export type CreateScheduleDto = z.infer<typeof CreateScheduleSchema>
export type UpdateScheduleDto = z.infer<typeof UpdateScheduleSchema>
export type ScheduleFilter = z.infer<typeof ScheduleFilterSchema>
export type CalendarEventFilter = z.infer<typeof CalendarEventFilterSchema>

// ── Enum literals ─────────────────────────────────────────────────────────────

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY"

export type ClassType = "LECTURE" | "LAB" | "TUTORIAL" | "SEMINAR"
export type EventType = "course" | "site" | "user" | "zoom"

// ── Response interfaces ────────────────────────────────────────────────────────

export interface TimetableSlot {
  id: number
  dayOfWeek: DayOfWeek
  startTime: string // HH:MM
  endTime: string // HH:MM
  venue: string
  classType: ClassType
  courseCode: string
  courseTitle: string
  creditUnits: number
  tutorId: number
  tutorName: string
  offeringId: number
}

export type TimetableGrouped = Partial<Record<DayOfWeek, TimetableSlot[]>>

export interface CalendarEvent {
  id: number
  eventType: EventType
  name: string
  description: string | null
  startDate: string
  endDate: string | null
  meetingUrl: string | null
  isVisible: boolean
  courseCode?: string
  courseTitle?: string
}

export interface Semester {
  id: number
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  registrationStart: string | null
  registrationEnd: string | null
}

export interface AcademicCalendarMeta {
  session: { id: number; name: string; startDate: string; endDate: string }
  semesters: Semester[]
  currentSemester: Semester | null
}

// GET /academic-calendar/sessions/:id — one session with all its semesters.
// The `.bru` shows no example body; fields beyond id/name are read
// defensively by consumers.
export interface AcademicSessionDetail {
  id: number
  name: string
  startDate: string | null
  endDate: string | null
  isActive: boolean
  semesters: Semester[]
}

// GET /academic-calendar/events — portal-side calendar announcements
// (Announcement rows with category "event"). Shape inferred from the
// Content/Announcements contract; every optional field is read with `?.`.
export interface AcademicCalendarEvent {
  id: number
  title: string
  body: string | null
  category: string | null
  startDate: string | null
  endDate: string | null
  publishedAt: string | null
  createdAt: string | null
}

export interface BusySlot {
  startTime: string
  endTime: string
  courseCode: string
  tutorName: string
}

export interface TimeWindow {
  startTime: string
  endTime: string
}

export interface VenueAvailability {
  venue: string
  dayOfWeek: DayOfWeek
  busySlots: BusySlot[]
  freeWindows: TimeWindow[]
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
