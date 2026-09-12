import type { z } from "zod"
import {
  EnrollmentStatusSchema,
  AttendanceStatusSchema,
  CreateEnrollmentSchema,
  BulkEnrollSchema,
  DropEnrollmentSchema,
  EnrollmentFilterSchema,
  RecordAttendanceSchema,
  BulkAttendanceSchema,
  UpdateAttendanceSchema,
} from "../schemas"

export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>

export type CreateEnrollmentDto = z.infer<typeof CreateEnrollmentSchema>
export type BulkEnrollDto = z.infer<typeof BulkEnrollSchema>
export type DropEnrollmentDto = z.infer<typeof DropEnrollmentSchema>
export type EnrollmentFilter = z.infer<typeof EnrollmentFilterSchema>
export type RecordAttendanceDto = z.infer<typeof RecordAttendanceSchema>
export type BulkAttendanceDto = z.infer<typeof BulkAttendanceSchema>
export type UpdateAttendanceDto = z.infer<typeof UpdateAttendanceSchema>

// ─── Response shapes ────────────────────────────────────────────────────────
// Flat, frontend-facing shapes — bruno documents different nesting per
// endpoint (By-Student nests `offering`, By-Offering nests `student`, plain
// List is unconfirmed) so the service maps every raw response into this one
// shape, enriching from already-real Course Offering / Student lookups when
// an endpoint's own response doesn't carry the name fields.

export interface EnrollmentRecord {
  id: number
  studentId: number
  offeringId: number
  semesterId: number
  status: EnrollmentStatus
  enrolledAt: string
  droppedAt: string | null
  studentName: string
  studentMatric: string
  courseCode: string
  courseTitle: string
  creditUnits: number
  lecturerName: string | null
  // Whether this course is mirrored on Moodle yet. Only populated when the
  // record has been cross-referenced with `GET /students/me/courses`
  // (see getMyCourses); `null` = unknown, not "not synced".
  moodleSynced?: boolean | null
}

// Lightweight row from `GET /students/me/courses` — api-v2.md §"Student
// Results & Courses". Course content lives on Moodle; this only says which
// offerings the student is enrolled in and whether each is Moodle-synced.
export interface MyCourseSummary {
  offeringId: number
  courseCode: string
  courseTitle: string
  semester: string | null
  moodleSynced: boolean
}

export interface EnrollmentPage {
  data: EnrollmentRecord[]
  meta: { total: number; page: number; limit: number }
}

export interface BulkEnrollResult {
  enrolled: { id: number; offeringId: number; status: EnrollmentStatus }[]
  errors: { offeringId: number; message: string }[]
}

export interface DropEnrollmentResult {
  id: number
  status: EnrollmentStatus
  droppedAt: string
}

export interface AttendanceRecord {
  id: number
  studentId: number
  scheduleId: number
  attendanceDate: string
  status: AttendanceStatus
  remarks: string | null
  createdAt: string
  studentName: string
  studentMatric: string
}

export interface BulkAttendanceResult {
  recorded: number
  errors: { studentId: number; message: string }[]
}

// One-time-use Moodle SSO redirect, minted fresh per click — see
// enrollment.service.ts's launchMoodleCourse and
// sandbox/schema-moodel-sync-refactor/api-v2.md §"Course Launch (SSO)".
export interface MoodleLaunchResult {
  redirectUrl: string
}

// Client-computed (no dedicated aggregate endpoint exists) — see
// enrollment.service.ts's getAttendanceSummary for the exact composition.
export interface AttendanceSummary {
  offeringId: number
  courseCode: string
  courseTitle: string
  totalSessions: number
  present: number
  late: number
  absent: number
  excused: number
  attendedPercent: number
}
