// ──────────────────────────────────────────────
// Shared Admin Domain Types
// ──────────────────────────────────────────────

import type { CourseOfferingEnrichment } from "@/lib/academic/course-offering-enrichment"

export interface AcademicSession {
  id: number
  name: string
  startDate: string
  endDate: string
  isActive: boolean
  // Major-Program Scoping — sandbox/major-program-scoping/SCHEMA_CHANGES.md
  // §2: null = institution-wide shared session. A non-null value scopes this
  // session to one MajorProgram, letting e.g. Undergraduate and Postgraduate
  // run independent calendars.
  majorProgramId?: number | null
}

export interface Semester {
  id: number
  academicSessionId: number
  name: string
  isActive: boolean
  startDate: string
  endDate: string
  registrationStart?: string
  registrationEnd?: string
}

// Legacy mock-only shape used by the admissions "Requirements" screen
// (RequirementsManager) — distinct from the real `Program` entity below,
// which uses numeric ids per bruno/academic. The real numeric id is
// stringified at the call site (AdmissionPageContainer) rather than
// changing this interface, since RequirementsManager's own comparison logic
// is written against string ids. Not the same interface as `Program`; kept
// separate to avoid a duplicate-name collision.
export interface LegacyProgramSummary {
  id: string
  name: string
  code: string
}

// ── Form / Payload types ────────────────────

export type CreateAcademicSessionPayload = Omit<AcademicSession, "id">
export type UpdateAcademicSessionPayload = Partial<CreateAcademicSessionPayload>

export type CreateSemesterPayload = Omit<Semester, "id">

// ── Course Structure ────────────────────────

// Real backend contract per bruno/academic — see CLAUDE.md §13. Faculty,
// Department, and Program all use numeric auto-increment ids and camelCase
// fields matching sandbox/schema.prisma exactly. `departments`/`programs`/
// `lecturers` are only populated when fetched via the single-resource GET
// (academic_README.md: "Get faculty by ID with departments" /
// "Get department with programs & lecturers") — list endpoints don't
// include them.
export interface Faculty {
  id: number
  name: string
  code: string
  description: string | null
  deanUserId: number | null
  email: string | null
  phoneNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  departments?: Department[]
}

export interface DepartmentLecturer {
  id: number
  userId: number
  staffNumber: string
  designation: string
  user?: {
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export interface Department {
  id: number
  facultyId: number | null
  name: string
  code: string
  description: string | null
  hodUserId: number | null
  email: string | null
  phoneNumber: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  programs?: Program[]
  lecturers?: DepartmentLecturer[]
}

// Multi-structure refactor — see sandbox/schema-moodel-sync-refactor/README.md
// §2. `DEGREE` is the default and preserves every existing Program's
// behavior unchanged; the other values let the same schema serve
// postgraduate schools, certificate/diploma tracks, and secondary schools.
// FOUNDATIONAL/PART_TIME added by the Multi-Program Platform — see
// sandbox/multi-program-platform/SCHEMA_CHANGES.md §1.
export type ProgramCategory =
  | "DEGREE"
  | "POSTGRADUATE"
  | "CERTIFICATE"
  | "DIPLOMA"
  | "SECONDARY_SCHOOL"
  | "FOUNDATIONAL"
  | "PART_TIME"

export interface Program {
  id: number
  departmentId: number | null
  name: string
  code: string
  degreeType: string
  durationYears: number
  description: string | null
  admissionRequirements: string | null
  minCreditUnits: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Multi-structure refactor additions — all nullable/defaulted so existing
  // DEGREE programs read back unchanged. See SCHEMA_CHANGES.md §3.
  programCategory: ProgramCategory
  parentAcademicUnitId: number | null
  gradingSchemeId: number | null
  // Major-Program Scoping — sandbox/major-program-scoping/SCHEMA_CHANGES.md §1.
  // UI that reads it must treat `undefined` the same as `null` ("not
  // assigned to a major program").
  majorProgramId?: number | null
  // sandbox/program-structure-depth/SCHEMA_CHANGES.md §5. Lowest
  // Level a fresh admission offer into this program can target (e.g. 200 for
  // a Part-Time direct-entry program). Null/undefined = no restriction,
  // today's exact behavior.
  entryLevelId?: number | null
}

// ── Major Programs — sandbox/major-program-scoping/ ─────────────────────────
// See bruno/academic/Major Programs - *.bru and
// sandbox/major-program-scoping/API_CONTRACTS.md §6. Distinct from
// `ProgramCategory`: a MajorProgram is an administrative/scoping boundary
// (who manages it, which calendar/fees/RBAC it scopes), not a structural
// shape — see sandbox/major-program-scoping/README.md §2.1.

export interface MajorProgram {
  id: number
  code: string
  name: string
  description: string | null
  isActive: boolean
  moodleRootCategoryId: number | null
  programCount?: number
  activeSessionId?: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateMajorProgramPayload {
  code: string
  name: string
  description?: string
}

export type UpdateMajorProgramPayload = Partial<CreateMajorProgramPayload> & {
  isActive?: boolean
}

// The caller's resolved major-program authorization scope — carried on the
// session/`me` response (§C of the same
// design doc). "ALL" = SUPER_ADMIN (or any other deliberately unscoped
// grant); an array = the specific major programs this user's role grants are
// scoped to. When absent, `useMajorProgramScope()`
// treats that the same as "ALL" so the single-major-program deployment stays
// the degenerate, unaffected case (see README.md §0's governing rule).
export type MajorProgramScopeEntry = Pick<MajorProgram, "id" | "code" | "name">
export type MajorProgramScope = MajorProgramScopeEntry[] | "ALL"

export interface CurriculumLevel {
  id: number
  name: string
  numericValue: number
}

// ── Cohorts — sandbox/program-structure-depth/ ──────────────────────────────
// Certificate programs' replacement
// for Session/Semester/Level — see SCHEMA_CHANGES.md §3. A Cohort is scoped
// to one CERTIFICATE-category Program, independent of AcademicSession, so
// multiple sittings (e.g. an ICAN May cohort and a CIB November cohort) can
// run concurrently with their own dates — something the institution-wide
// single-active-session model can't represent.

export type CohortStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "EXAM_WINDOW"
  | "CLOSED"
  | "CERTIFIED"
  | "CANCELLED"

export interface Cohort {
  id: number
  programId: number
  code: string
  name: string
  startDate: string
  endDate: string
  examWindowStart: string | null
  examWindowEnd: string | null
  capacity: number | null
  status: CohortStatus
  enrolledCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCohortPayload {
  programId: number
  code: string
  name: string
  startDate: string
  endDate: string
  examWindowStart?: string
  examWindowEnd?: string
  capacity?: number
}

export type UpdateCohortPayload = Partial<
  Omit<CreateCohortPayload, "programId">
>

export interface TransitionCohortPayload {
  status: CohortStatus
  reason?: string
}

// ── Academic Structure (generic AcademicUnit tree) ──────────────────────────
// Confirmed live — see sandbox/schema-moodel-sync-refactor/{README,api-v2}.md
// §"Academic Structure" (tracked as MISSING_BACKEND_APIS.md §2.16, now shipped
// by the backend team). Gives the Structure Builder admin UI and Moodle
// category sync one uniform tree to walk regardless of a given deployment's
// real shape (Faculty→Department→Program for a degree school, or pure
// structural nodes like "Stream"/"Section" for a secondary school — see the
// README's worked examples). Not yet documented in bruno, but every consumer
// of this section calls the real `/academic-structure` endpoints.

export type AcademicUnitLinkKind =
  | "faculty"
  | "department"
  | "program"
  | "level"
  | "semester"
  // sandbox/major-program-scoping/README.md §4.E. Lets a
  // MajorProgram get a real mirror root node in the tree (same pattern as
  // "faculty" via resolveFacultyAcademicUnit), so Moodle sync can push one
  // root category per major program (matching the "CERTIFICATE PROGRAMS" /
  // "FOUNDATIONAL/JUPEB PROGRAMS" / "PART-TIME PROGRAMS" top-level Moodle
  // categories the university already organizes courses under). Not yet a
  // recognized `linkedEntity.type` on the real backend.
  | "major_program"

export interface AcademicUnitType {
  id: number
  code: string
  label: string
}

export interface AcademicUnitLinkedEntity {
  type: AcademicUnitLinkKind
  id: number
}

export interface AcademicUnit {
  id: number
  typeId: number
  typeCode: string
  parentId: number | null
  name: string
  sortOrder: number
  linkedEntity: AcademicUnitLinkedEntity | null
  isActive: boolean
  childCount: number
}

export interface AcademicUnitDetail extends AcademicUnit {
  children: AcademicUnit[]
}

export interface CreateUnitTypePayload {
  code: string
  label: string
}

export interface CreateAcademicUnitPayload {
  typeCode: string
  parentId?: number | null
  name: string
  sortOrder?: number
  linkedEntity?: AcademicUnitLinkedEntity | null
}

export type UpdateAcademicUnitPayload = Partial<
  Pick<CreateAcademicUnitPayload, "name" | "sortOrder" | "parentId">
>

export interface CreateFacultyPayload {
  name: string
  code: string
  description?: string
  deanUserId?: number
  email?: string
  phoneNumber?: string
}

// `isActive` reactivates/deactivates through the same PATCH
// (bruno/academic/Faculties - Update.bru). Same on Department and Program.
export type UpdateFacultyPayload = Partial<CreateFacultyPayload> & {
  isActive?: boolean
}

export interface CreateDepartmentPayload {
  // Nullable so a Department can anchor a non-degree structure (e.g. a
  // "School of Postgraduate Studies") with no parent Faculty — see
  // sandbox/schema-moodel-sync-refactor/README.md §3.
  facultyId: number | null
  name: string
  code: string
  description?: string
  hodUserId?: number
  email?: string
  phoneNumber?: string
}

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload> & {
  isActive?: boolean
}

export interface CreateProgramPayload {
  // Nullable for the same reason as Department.facultyId above — a
  // SECONDARY_SCHOOL Program anchors under the AcademicUnit tree instead
  // via parentAcademicUnitId, not a Department.
  departmentId: number | null
  name: string
  code: string
  degreeType: string
  durationYears: number
  description?: string
  admissionRequirements?: string
  minCreditUnits: number
  programCategory?: ProgramCategory
  parentAcademicUnitId?: number | null
  gradingSchemeId?: number | null
  // See MajorProgram note above.
  majorProgramId?: number | null
}

export type UpdateProgramPayload = Partial<CreateProgramPayload> & {
  isActive?: boolean
}

export interface CreateCurriculumLevelPayload {
  name: string
  numericValue: number
}

// ── Course Management ───────────────────────
// Real backend contract per bruno/course and sandbox/course/course_README.md
// (source of truth — see CLAUDE.md §13). `curriculum_semester` mirrors
// curriculumApi.ts's handling of the `curriculumSemester` field (see
// missing_curriculum_apis.readme.md / MISSING_BACKEND_APIS.md §2.6) — now
// shipped by the backend team, so this reads/writes for real.
//
// There is no reverse "which programs is this course in" lookup endpoint —
// only "which courses are in this program" (`GET /courses/programs/:id`,
// each entry = Course fields + isRequired). `ProgramCourse` below is that
// shape, not a separate junction-row type with its own id; assign/remove
// are keyed by the (programId, courseId) pair, and there is no dedicated
// "update a mapping" endpoint — toggling isRequired is a remove+reassign.

// `SUBJECT`/`RESEARCH_PROJECT` added by the multi-structure refactor — a WAEC
// subject and a thesis/dissertation unit are both modeled as a Course row,
// just with a different course_type. See SCHEMA_CHANGES.md §1.
export type CourseType =
  | "GENERAL"
  | "FACULTY"
  | "DEPARTMENTAL"
  | "ELECTIVE"
  | "SUBJECT"
  | "RESEARCH_PROJECT"

export interface Course {
  id: number
  code: string
  title: string
  description: string | null
  credit_units: number
  course_type: CourseType
  // Nullable — sandbox/program-structure-depth/SCHEMA_CHANGES.md
  // §1: null for a course that only ever attaches to a FOUNDATIONAL or
  // CERTIFICATE program (neither uses the Level layer). Still required in
  // practice for every DEGREE/PART_TIME/POSTGRADUATE/DIPLOMA/
  // SECONDARY_SCHOOL course — see courseSchema's superRefine.
  level_id: number | null
  owning_department_id: number | null
  syllabus: string | null
  curriculum_semester: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProgramCourse extends Course {
  is_required: boolean
}

export interface CreateCoursePayload {
  code: string
  title: string
  description?: string
  credit_units: number
  course_type: CourseType
  // Nullable — see Course.level_id note above.
  level_id: number | null
  owning_department_id?: number | null
  syllabus?: string
}

export type UpdateCoursePayload = Partial<CreateCoursePayload>

export interface AssignCourseToProgramPayload {
  program_id: number
  course_id: number
  is_required: boolean
}

// ── Course Prerequisites ─────────────────────
// GET /courses/:id/prerequisites and the `prerequisites` array nested in
// GET /courses/:id both return this trimmed shape per course_README.md
// ("each entry: id, code, title").

export interface CoursePrerequisite {
  id: number
  code: string
  title: string
}

// ── Course Offerings ─────────────────────────
// One offering = one course running in one semester of one session. Real
// contract per course_README.md's "Course Offerings"/"Offering Lecturers"/
// "Class Schedules" sections.

export type CourseOfferingStatus = "PLANNED" | "OPEN" | "CLOSED" | "CANCELLED"
export type OfferingLecturerRole = "primary" | "assistant" | "tutorial"

// Base offering fields plus the shared enrichment block (credit units, term
// names, level, department/faculty, programmes, category path, enrolled_count).
// See sandbox/course/missing_course_offering_enrichment.readme.md; the
// enrichment block is `null` / `[]` until that ships.
export interface CourseOffering extends CourseOfferingEnrichment {
  id: number
  course_id: number
  course_code: string
  course_title: string
  academic_session_id: number
  semester_id: number
  max_capacity: number | null
  status: CourseOfferingStatus
  created_at: string
  updated_at: string
}

export interface OfferingLecturerAssignment {
  lecturer_id: number
  role: OfferingLecturerRole
}

export interface ClassSchedule {
  id: number
  offering_id: number
  lecturer_id: number
  day_of_week: string
  start_time: string
  end_time: string
  venue: string
  class_type: string
}

export interface CourseOfferingDetail extends CourseOffering {
  lecturers: OfferingLecturerAssignment[]
  schedules: ClassSchedule[]
}

export interface CreateOfferingPayload {
  course_id: number
  academic_session_id: number
  semester_id: number
  max_capacity?: number
  status?: CourseOfferingStatus
}

export type UpdateOfferingPayload = Partial<
  Pick<CreateOfferingPayload, "max_capacity" | "status">
>

export interface AssignLecturerPayload {
  offering_id: number
  lecturer_id: number
  role?: OfferingLecturerRole
}

export interface CreateSchedulePayload {
  offering_id: number
  lecturer_id: number
  day_of_week: string
  start_time: string
  end_time: string
  venue: string
  class_type: string
}

export type UpdateSchedulePayload = Partial<
  Omit<CreateSchedulePayload, "offering_id">
>

// ── Admissions ──────────────────────────────
// Real backend contract per sandbox/admission/missing_admission_cycle_apis.readme.md
// (source of truth — see CLAUDE.md §13). Named `AdmissionCycleStatus`, not
// `AdmissionStatus`, to avoid colliding with schema.prisma's unrelated
// `AdmissionStatus` enum (OFFERED/ACCEPTED/DECLINED/EXPIRED) on the Admission
// (offer) model — a different concept entirely from an admission cycle/window.

export type AdmissionCycleStatus = "DRAFT" | "OPEN" | "CLOSED"

export interface AdmissionCycle {
  id: number
  academic_session_id: number
  status: AdmissionCycleStatus
  application_start_date: string
  application_end_date: string // "" means no deadline (infinite)
  late_application_allowed: boolean
  late_application_fee: number
  max_applications: number // 0 means unlimited
  require_documents: boolean
  required_documents: string[]
  notification_email: string
  instructions: string
  created_at: string
  updated_at: string
}

export interface AdmissionRequirement {
  id: number
  admission_cycle_id: number
  program_id: string // "" means all programs (numeric program id, stringified)
  min_age: number // 0 means no min
  max_age: number // 0 means no max
  min_credits: number
  required_subjects: string[]
  description: string
}

export type CreateAdmissionCyclePayload = Omit<
  AdmissionCycle,
  "id" | "created_at" | "updated_at"
>
export type UpdateAdmissionCyclePayload = Partial<CreateAdmissionCyclePayload>
export type CreateAdmissionRequirementPayload = Omit<AdmissionRequirement, "id">

// ── Admission Applications (Review) ─────────

export type ApplicationReviewStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "denied"

export interface ApplicantPersonalInfo {
  first_name: string
  last_name: string
  middle_name: string
  date_of_birth: string
  gender: "male" | "female" | "other"
  nationality: string
  state_of_origin: string
  lga: string
  phone: string
  email: string
  address: string
  passport_url: string
}

export interface ApplicantAcademicRecord {
  institution: string
  qualification: string
  year_obtained: string
  grade: string
  certificate_url: string
}

export interface ApplicantDocument {
  id: string
  name: string
  type: string
  url: string
  uploaded_at: string
}

export interface ApplicantProgramChoice {
  first_choice_program_id: string
  first_choice_program_name: string
  second_choice_program_id: string
  second_choice_program_name: string
  entry_mode: "utme" | "direct_entry" | "transfer"
  jamb_reg_no: string
  jamb_score: number
}

export interface AdmissionApplication {
  id: string
  applicant_id: string
  admission_cycle_id: string
  session: string
  status: ApplicationReviewStatus
  personal_info: ApplicantPersonalInfo
  academic_records: ApplicantAcademicRecord[]
  program_choice: ApplicantProgramChoice
  documents: ApplicantDocument[]
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  denial_reason: string | null
  created_at: string
  updated_at: string
  /** Dynamic Admission — answers as the applicant saw the form. Absent until the backend ships it. */
  form?: ApplicationFormSheet | null
  /** Answers to program-specific questions, by field key. */
  custom_fields?: Record<string, ApplicationAnswerValue> | null
}

// ── Application answer sheet — sandbox/dynamic-admission/API_CONTRACTS.md §3.6 ──
export interface ApplicationFormFile {
  documentId: number
  fileName: string
  url: string
}

export type ApplicationAnswerValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | ApplicationFormFile
  | ApplicationFormFile[]
  | Record<string, string | number | boolean | null>[]

export interface ApplicationFormSheetField {
  key: string
  label: string
  type: import("./admissionConfig").FormFieldType
  systemKey: string | null
  value: ApplicationAnswerValue
  displayValue: string | null
  visible: boolean
}

export interface ApplicationFormSheetStep {
  key: string
  label: string
  fields: ApplicationFormSheetField[]
}

export interface ApplicationFormSheet {
  version: number
  steps: ApplicationFormSheetStep[]
}

export type UpdateApplicationPayload = {
  personal_info?: Partial<ApplicantPersonalInfo>
  academic_records?: ApplicantAcademicRecord[]
  program_choice?: Partial<ApplicantProgramChoice>
  documents?: ApplicantDocument[]
}

export type ReviewApplicationPayload = {
  status: "approved" | "denied"
  denial_reason?: string
}

// ── API response wrappers ───────────────────

export interface ApiListResponse<T> {
  data: T[]
  total: number
}

/** Paginated envelope matching this backend's real `{ data, meta }` list responses (e.g. GET /admissions/applications). */
export interface ApiPaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
  }
}

export interface ApiSingleResponse<T> {
  data: T
  message?: string
}

// ── Configuration / Settings ─────────────────

export type SettingGroup =
  | "university"
  | "academic"
  | "payment"
  | "moodle"
  | "system"

export interface Setting {
  id: number
  key: string
  value: string
  group: string
  createdAt: string
  updatedAt: string
}

export interface CreateSettingPayload {
  key: string
  value: string
  group: string
}

export interface UpdateSettingPayload {
  value?: string
  group?: string
}

export interface SettingsQueryParams {
  group?: string
  page?: number
  limit?: number
}
