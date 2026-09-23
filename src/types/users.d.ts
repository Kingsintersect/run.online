// ──────────────────────────────────────────────
// User Management Domain Types
// (derived from backend Prisma schema)
// ──────────────────────────────────────────────

import type { CourseOfferingEnrichment } from "@/lib/academic/course-offering-enrichment"

export type Gender = "MALE" | "FEMALE"
export type EntryMode = "UTME" | "DIRECT_ENTRY" | "TRANSFER"
export type ModeOfStudy = "FULL_TIME" | "PART_TIME" | "SANDWICH" | "DISTANCE"
export type StudentStatus =
  | "ACTIVE"
  | "GRADUATED"
  | "WITHDRAWN"
  | "SUSPENDED"
  | "RUSTICATED"
  | "DEFERRED"

// ── User (core auth record) ─────────────────

export interface User {
  id: number
  email: string
  username: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  phone_number: string | null
  avatar: string | null
  is_active: boolean
  is_verified: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
  // CORRECTION (2026-09-12): was `{id,name,slug}[]` — confirmed live via
  // GET /users that the real backend sends bare role-name strings (e.g.
  // `["student"]`), matching the session's own roles shape. See the
  // matching note on WireUser.roles in @/services/usersApi.ts.
  roles: string[]
}

// ── Student ─────────────────────────────────

export interface Student {
  id: number
  user_id: number
  matric_number: string
  program_id: number
  program_name: string
  department_name: string
  faculty_name: string
  // Nullable — sandbox/program-structure-depth/SCHEMA_CHANGES.md
  // §2: null for a FOUNDATIONAL or CERTIFICATE student, neither of which
  // has a Level concept. A CERTIFICATE student has `current_cohort_id`
  // instead.
  current_level: number | null
  current_level_id: number | null
  // Populated only for a CERTIFICATE-category student.
  current_cohort_id?: number | null
  entry_mode: EntryMode
  mode_of_study: ModeOfStudy
  admission_date: string
  graduation_date: string | null
  status: StudentStatus
  current_cgpa: number | null
  date_of_birth: string
  gender: Gender
  nationality: string
  state_of_origin: string
  lga_of_origin: string
  permanent_address: string
  contact_address: string
  guardian_name: string
  guardian_phone: string
  guardian_email: string | null
  passport_photo: string | null
  created_at: string
  updated_at: string
  // Nested user info
  user: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "first_name"
    | "middle_name"
    | "last_name"
    | "phone_number"
    | "avatar"
    | "is_active"
  >
}

// ── Tutor ────────────────────────────────

export interface TutorOnboardingProgress {
  profileConfirmed: boolean
  coursesConfirmed: boolean
  firstAnnouncementPosted: boolean
}

export type TutorOnboardingStep = keyof TutorOnboardingProgress

export interface Tutor {
  id: number
  user_id: number
  staff_number: string
  department_id: number
  department_name: string
  faculty_name: string
  // Major-Program Scoping — carried on every Lecturer profile since A17/A27,
  // confirmed live but previously never mapped onto this type. Null for an
  // unscoped tutor (SUPER_ADMIN-created without a program, rare).
  major_program_id: number | null
  major_program_name: string | null
  designation: string
  specialization: string | null
  office_location: string | null
  office_phone: string | null
  qualifications: string | null
  research_areas: string | null
  bio: string | null
  // Onboarding checklist — present on `GET /users/lecturers/{me,:id}` since
  // 2026-09-01 (tutor_onboarding_workflow.md §5). Optional/defaulted here so
  // older responses don't break.
  onboarding_progress: TutorOnboardingProgress
  onboarding_complete: boolean
  created_at: string
  updated_at: string
  user: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "first_name"
    | "middle_name"
    | "last_name"
    | "phone_number"
    | "avatar"
    | "is_active"
  >
}

// ── Staff ───────────────────────────────────

export interface Staff {
  id: number
  user_id: number
  staff_number: string
  department_id: number | null
  department_name: string | null
  // Major-Program Scoping — optional on Staff (A36 item 5: a staff role can
  // be genuinely institution-wide, e.g. bursary/director/dean), unlike
  // Tutor's required one.
  major_program_id: number | null
  major_program_name: string | null
  designation: string
  job_title: string
  office_location: string | null
  office_phone: string | null
  created_at: string
  updated_at: string
  user: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "first_name"
    | "middle_name"
    | "last_name"
    | "phone_number"
    | "avatar"
    | "is_active"
  >
}

// ── Payload types ───────────────────────────

export interface CreateTutorPayload {
  email: string
  first_name: string
  middle_name?: string
  last_name: string
  phone_number?: string
  staff_number: string
  faculty_id: number
  department_id: number
  major_program_id: number
  designation: string
  specialization?: string
  office_location?: string
  office_phone?: string
  date_of_birth?: string
  gender?: Gender
  nationality?: string
  state_of_origin?: string
}

export interface CreateStaffPayload {
  // Matches CreateTutorPayload's convention — identify the target by email,
  // not a numeric id an admin has no way to look up. sandbox/tutor-staff-user-
  // creation/API_CONTRACTS.md — if no account with this email exists yet,
  // usersApi.createStaff() creates one inline rather than requiring it to
  // pre-exist.
  email: string
  first_name: string
  middle_name?: string
  last_name: string
  phone_number?: string
  staff_number: string
  department_id?: number
  // Major-Program Scoping — A27: Staff is one of the 7 roles scoped to
  // exactly one major program at creation (required, not nullable), same as
  // CreateTutorPayload.major_program_id.
  major_program_id: number
  designation: string
  job_title: string
  role_id: number // selected staff role (e.g. Staff, Registrar, HOD, Bursary)
  office_location?: string
  office_phone?: string
  date_of_birth?: string
  gender?: Gender
  nationality?: string
  state_of_origin?: string
}

export interface UpdateStudentPayload {
  // Nullable — see Student.current_level_id's note above.
  current_level_id?: number | null
  mode_of_study?: ModeOfStudy
  status?: StudentStatus
  contact_address?: string
  phone_number?: string
}

export interface UpdateTutorPayload {
  designation?: string
  specialization?: string
  office_location?: string
  office_phone?: string
  qualifications?: string
  research_areas?: string
  bio?: string
}

export interface UpdateStaffPayload {
  designation?: string
  job_title?: string
  office_location?: string
  office_phone?: string
}

// ── Course Assignment ───────────────────────

export type CourseType = "GENERAL" | "FACULTY" | "DEPARTMENTAL" | "ELECTIVE"
export type CourseOfferingStatus = "PLANNED" | "OPEN" | "CLOSED" | "CANCELLED"
export type TutorCourseRole = "primary" | "assistant" | "tutorial"

export interface Course {
  id: number
  code: string
  title: string
  credit_units: number
  course_type: CourseType
  level_id: number
  department_name: string | null
  is_active: boolean
}

// The category-tree node and programme-link shapes live in the shared enrichment
// module (same shapes used by `@/types/school`); re-exported here for callers
// that import them from this module.
export type {
  CourseCategoryNode,
  CourseProgramLink,
} from "@/lib/academic/course-offering-enrichment"

// Enriched `GET /courses/offerings` item — base fields plus the shared
// enrichment block (credit units, term names, level, department/faculty,
// programmes, category path). See
// sandbox/course/missing_course_offering_enrichment.readme.md for the backend
// contract; enrichment fields may be `null` / `[]` when the backend omits them.
export interface CourseOffering extends CourseOfferingEnrichment {
  id: number
  course_id: number
  course_code: string
  course_title: string
  academic_session_id: number
  semester_id: number
  max_capacity: number | null
  status: CourseOfferingStatus
}

export interface TutorCourseAssignment {
  id: number
  offering_id: number
  tutor_id: number
  role: TutorCourseRole
  created_at: string
  offering: CourseOffering
}

export interface AssignCoursePayload {
  tutor_id: number
  offering_id: number
  role?: TutorCourseRole
}

export interface UnassignCoursePayload {
  tutor_id: number
  offering_id: number
}

// ── Role eligible for staff/tutor assignment ─

export interface EligibleRole {
  id: number
  name: string
  slug: string
  description: string | null
}

// ── Bulk Import (Tutor Onboarding) ──────────
// See sandbox/user/tutor_onboarding_README.md §1 for the full contract.
// `sendWelcomeEmail`/`loginUrl`/`templateId` are an additive extension to the
// already-live `POST /users/bulk-import` endpoint — built against that spec
// now, same convention as `getMyLecturer`/`listCourseOfferings` elsewhere in
// this module. If the backend doesn't recognize them yet, they're extra
// multipart fields it can simply ignore; `generatedPassword` keeps coming
// back in the response until the backend honors `sendWelcomeEmail`.

export interface BulkImportTutorsPayload {
  file: File
  send_welcome_email?: boolean
  login_url?: string
  template_id?: number
}

export type BulkImportRowAction = "created" | "updated" | "skipped" | "failed"

export interface BulkImportRow {
  row: number
  email: string
  role: string
  success: boolean
  action: BulkImportRowAction
  user_id: number | null
  error?: string
  generated_password?: string
  email_sent?: boolean
  email_error?: string
}

export interface BulkImportResult {
  total: number
  succeeded: number
  failed: number
  results: BulkImportRow[]
}

export interface UserQueryFilters {
  search?: string
  is_active?: boolean
  page?: number
  limit?: number
  // MISSING_BACKEND_APIS.md §2.8 "Director module", now shipped by the
  // backend team — a name-based faculty/department filter, sent alongside
  // the existing programId/departmentId FKs.
  faculty_name?: string
  department_name?: string
  // Major-Program Scoping — not confirmed live on this endpoint (unlike
  // programId, which is). Sent speculatively per CLAUDE.md §14; if the
  // backend ignores it, the list is simply unfiltered by major program
  // rather than silently wrong, since nothing here re-filters client-side
  // against a possibly-incomplete page of results.
  major_program_id?: number
}

export interface StudentQueryFilters extends UserQueryFilters {
  status?: StudentStatus
  program_id?: number
  level?: number
}

export interface UserStats {
  total_users: number
  total_students: number
  total_tutors: number
  total_staff: number
  active_users: number
  // Proposed extension — see MISSING_BACKEND_APIS.md §2.8. Not part of the
  // originally-proposed /users/stats shape; needed for Director's Overview
  // and Statistical tabs so they don't have to page through and aggregate
  // every student/tutor client-side.
  by_faculty?: {
    faculty_id: number
    faculty_name: string
    students: number
    tutors: number
  }[]
  students_by_level?: { level: number; count: number }[]
  students_by_gender?: { male: number; female: number }
  tutors_by_designation?: { designation: string; count: number }[]
}
