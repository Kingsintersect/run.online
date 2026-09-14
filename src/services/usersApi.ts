import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type {
  User,
  Student,
  Tutor,
  TutorOnboardingStep,
  TutorOnboardingProgress,
  Staff,
  UserStats,
  UserQueryFilters,
  StudentQueryFilters,
  CreateTutorPayload,
  CreateStaffPayload,
  UpdateStudentPayload,
  UpdateTutorPayload,
  UpdateStaffPayload,
  CourseOffering,
  TutorCourseAssignment,
  AssignCoursePayload,
  UnassignCoursePayload,
  EligibleRole,
  BulkImportTutorsPayload,
  BulkImportResult,
  BulkImportRow,
} from "@/types/users"
import type {
  ApiListResponse,
  ApiSingleResponse,
  ApiPaginatedResponse,
} from "@/types/school"
import {
  fetchAcademicTermNames,
  mapCourseOfferingEnrichment,
  type AcademicTermNames,
  type WireEnrichedCourseFields,
} from "@/lib/academic/course-offering-enrichment"

// Real backend contract per bruno/user/*.bru and sandbox/user/user_README.md (source of
// truth — see CLAUDE.md §13). The backend uses camelCase field names throughout
// (firstName, isActive, departmentId, ...) while this module's existing frontend types
// stay snake_case to avoid touching every consuming component — each function below maps
// the real response onto those types. Two things are NOT confirmed by an example response
// body anywhere in bruno/the README (only request bodies and prose are documented for
// Students/Lecturers/Staff) and are inferred from schema.prisma's relation names instead:
//   1. Whether GET responses nest relations (department/program/currentLevel/faculty) or
//      just return raw FK ids — every mapper below reads relation fields defensively with
//      `??` fallbacks so a missing nested object shows "—" rather than throwing.
//   2. Whether `GET /users` list items include a `roles` array — the README's own example
//      response for this endpoint does NOT show one, so it's defaulted to `[]` here.
// Both are worth a live check against the real API; see MISSING_BACKEND_APIS.md.
const AUTH = { access_token: true } as const

// ── wire shapes (camelCase, as documented) ──

interface WireUserRef {
  id: number
  email: string
  username: string
  firstName: string | null
  middleName: string | null
  lastName: string | null
  phoneNumber: string | null
  avatar: string | null
  isActive: boolean
}

interface WireUser extends WireUserRef {
  isVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt?: string
  // CORRECTION (2026-09-12): typed as `{id,name,slug}[]` since this
  // module's inception, but confirmed live via GET /users (SUPER_ADMIN
  // token) that the real backend sends bare role-name strings, e.g.
  // `["student"]` — matching NextAuth's own session.user.roles shape
  // elsewhere in the app. The object-shape assumption meant every role
  // badge rendered blank with an undefined React key — found via a full
  // browser QA sweep. See User.roles in @/types/users for the same fix.
  roles?: string[]
}

interface WireRelationRef {
  id: number
  name: string
}

interface WireStudent {
  id: number
  userId: number
  matricNumber: string
  programId: number
  currentLevelId: number
  entryMode: Student["entry_mode"]
  modeOfStudy: Student["mode_of_study"]
  admissionDate: string
  graduationDate: string | null
  status: Student["status"]
  currentCGPA: number | string | null
  dateOfBirth: string
  gender: Student["gender"]
  nationality: string
  stateOfOrigin: string
  lgaOfOrigin: string
  permanentAddress: string
  contactAddress: string
  guardianName: string
  guardianPhone: string
  guardianEmail: string | null
  passportPhoto: string | null
  createdAt: string
  updatedAt: string
  user: WireUserRef
  program?: WireRelationRef & {
    department?: WireRelationRef & { faculty?: WireRelationRef }
  }
  currentLevel?: WireRelationRef & { numericValue: number }
}

interface WireStaffProfile {
  id: number
  userId: number
  staffNumber: string
  departmentId: number | null
  designation: string
  officeLocation: string | null
  officePhone: string | null
  createdAt: string
  updatedAt: string
  user: WireUserRef
  department?: WireRelationRef & { faculty?: WireRelationRef }
}

interface WireLecturer extends WireStaffProfile {
  specialization: string | null
  qualifications: string | null
  researchAreas: string | null
  bio: string | null
  onboardingProgress?: {
    profileConfirmed?: boolean
    coursesConfirmed?: boolean
    firstAnnouncementPosted?: boolean
  }
  onboardingComplete?: boolean
}

interface WireStaff extends WireStaffProfile {
  jobTitle: string
}

// `GET /courses/offerings` shape. Base fields (`id`, `courseId`,
// `academicSessionId`, `semesterId`, `maxCapacity`, `status`, `course.{code,
// title}`) are what ships today; `session`/`semester`, `enrolledCount`, and the
// enriched `course` fields (`WireEnrichedCourseFields`) come from the
// enrichment in sandbox/course/missing_course_offering_enrichment.readme.md and
// are mapped defensively via `mapCourseOfferingEnrichment`. `role`/`assignedAt`
// appear only on the `?lecturerId=` filtered response.
interface WireCourseOffering {
  id: number
  courseId: number
  course: { code: string; title: string } & WireEnrichedCourseFields
  academicSessionId: number
  semesterId: number
  session?: { id: number; name: string }
  semester?: { id: number; name: string }
  maxCapacity: number | null
  enrolledCount?: number
  status: CourseOffering["status"]
  role?: TutorCourseAssignment["role"]
  assignedAt?: string
}

interface WireBulkImportRow {
  row: number
  email: string
  role: string
  success: boolean
  action: BulkImportRow["action"]
  userId: number | null
  error?: string
  generatedPassword?: string
  emailSent?: boolean
  emailError?: string
}

const mapBulkImportRow = (r: WireBulkImportRow): BulkImportRow => ({
  row: r.row,
  email: r.email,
  role: r.role,
  success: r.success,
  action: r.action,
  user_id: r.userId,
  error: r.error,
  generated_password: r.generatedPassword,
  email_sent: r.emailSent,
  email_error: r.emailError,
})

const mapCourseOffering = (
  o: WireCourseOffering,
  terms?: AcademicTermNames
): CourseOffering => ({
  id: o.id,
  course_id: o.courseId,
  course_code: o.course?.code ?? "—",
  course_title: o.course?.title ?? "Untitled course",
  academic_session_id: o.academicSessionId,
  semester_id: o.semesterId,
  max_capacity: o.maxCapacity ?? null,
  status: o.status,
  ...mapCourseOfferingEnrichment(o, terms),
})

// ── mappers: wire (camelCase) → frontend (snake_case) ──

const mapUserRef = (u: WireUserRef): Student["user"] => ({
  id: u.id,
  email: u.email,
  username: u.username,
  first_name: u.firstName,
  middle_name: u.middleName,
  last_name: u.lastName,
  phone_number: u.phoneNumber,
  avatar: u.avatar,
  is_active: u.isActive,
})

const mapUser = (u: WireUser): User => ({
  id: u.id,
  email: u.email,
  username: u.username,
  first_name: u.firstName,
  middle_name: u.middleName,
  last_name: u.lastName,
  phone_number: u.phoneNumber,
  avatar: u.avatar,
  is_active: u.isActive,
  is_verified: u.isVerified,
  last_login_at: u.lastLoginAt,
  created_at: u.createdAt,
  updated_at: u.updatedAt ?? u.createdAt,
  roles: u.roles ?? [],
})

const mapStudent = (s: WireStudent): Student => ({
  id: s.id,
  user_id: s.userId,
  matric_number: s.matricNumber,
  program_id: s.programId,
  program_name: s.program?.name ?? "—",
  department_name: s.program?.department?.name ?? "—",
  faculty_name: s.program?.department?.faculty?.name ?? "—",
  // Nullable — sandbox/program-structure-depth/. `0` was
  // previously used as a "no level" sentinel; `null` is the correct
  // representation now that FOUNDATIONAL/CERTIFICATE students genuinely
  // have no Level at all (see Student.current_level_id's note).
  current_level: s.currentLevel?.numericValue ?? null,
  current_level_id: s.currentLevelId ?? s.currentLevel?.id ?? null,
  entry_mode: s.entryMode,
  mode_of_study: s.modeOfStudy,
  admission_date: s.admissionDate,
  graduation_date: s.graduationDate,
  status: s.status,
  current_cgpa: s.currentCGPA != null ? Number(s.currentCGPA) : null,
  date_of_birth: s.dateOfBirth,
  gender: s.gender,
  nationality: s.nationality,
  state_of_origin: s.stateOfOrigin,
  lga_of_origin: s.lgaOfOrigin,
  permanent_address: s.permanentAddress,
  contact_address: s.contactAddress,
  guardian_name: s.guardianName,
  guardian_phone: s.guardianPhone,
  guardian_email: s.guardianEmail,
  passport_photo: s.passportPhoto,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
  user: mapUserRef(s.user),
})

const mapTutor = (l: WireLecturer): Tutor => ({
  id: l.id,
  user_id: l.userId,
  staff_number: l.staffNumber,
  department_id: l.departmentId ?? 0,
  department_name: l.department?.name ?? "—",
  faculty_name: l.department?.faculty?.name ?? "—",
  designation: l.designation,
  specialization: l.specialization,
  office_location: l.officeLocation,
  office_phone: l.officePhone,
  qualifications: l.qualifications,
  research_areas: l.researchAreas,
  bio: l.bio,
  onboarding_progress: {
    profileConfirmed: l.onboardingProgress?.profileConfirmed ?? false,
    coursesConfirmed: l.onboardingProgress?.coursesConfirmed ?? false,
    firstAnnouncementPosted:
      l.onboardingProgress?.firstAnnouncementPosted ?? false,
  },
  onboarding_complete:
    l.onboardingComplete ??
    Boolean(
      l.onboardingProgress?.profileConfirmed &&
      l.onboardingProgress?.coursesConfirmed &&
      l.onboardingProgress?.firstAnnouncementPosted
    ),
  created_at: l.createdAt,
  updated_at: l.updatedAt,
  user: mapUserRef(l.user),
})

const mapStaff = (s: WireStaff): Staff => ({
  id: s.id,
  user_id: s.userId,
  staff_number: s.staffNumber,
  department_id: s.departmentId,
  department_name: s.department?.name ?? null,
  designation: s.designation,
  job_title: s.jobTitle,
  office_location: s.officeLocation,
  office_phone: s.officePhone,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
  user: mapUserRef(s.user),
})

// ── API implementations ─────────────────────

export const usersApi = {
  /* ── Users ── */
  async listUsers(filters?: UserQueryFilters): Promise<ApiListResponse<User>> {
    const res = await apiClient.get<ApiPaginatedResponse<WireUser>>("/users", {
      ...AUTH,
      params: {
        search: filters?.search,
        isActive: filters?.is_active,
        page: filters?.page,
        limit: filters?.limit ?? 100,
      },
    })
    return { data: res.data.map(mapUser), total: res.meta.total }
  },

  async getUserById(id: number): Promise<ApiSingleResponse<User>> {
    const res = await apiClient.get<{ data: WireUser }>(`/users/${id}`, AUTH)
    return { data: mapUser(res.data) }
  },

  // Deactivate / reactivate a user account (portal-access flag). `DELETE
  // /users/:id` is a soft-delete of the same kind; a `PATCH isActive` is the
  // reversible equivalent the admin tables use. Direct set, not a toggle — the
  // caller passes the target state from the row it already has.
  async setUserActive(
    id: number,
    isActive: boolean
  ): Promise<ApiSingleResponse<User>> {
    const res = await apiClient.patch<{ data: WireUser }>(
      `/users/${id}`,
      { isActive },
      AUTH
    )
    return { data: mapUser(res.data) }
  },

  /* ── Students ── */
  // `facultyName`/`departmentName`/`level` are proposed params — see
  // MISSING_BACKEND_APIS.md §2.8. The confirmed real filter for level is
  // `currentLevelId` (a Level FK), not the numeric value itself; sending
  // `level` directly (100/200/...) alongside it is the ask, so Director's
  // filter bar (which only has the numeric value, not the Level id) works
  // without an extra lookup once the backend adds support.
  async listStudents(
    filters?: StudentQueryFilters
  ): Promise<ApiListResponse<Student>> {
    const res = await apiClient.get<ApiPaginatedResponse<WireStudent>>(
      "/users/students",
      {
        ...AUTH,
        params: {
          search: filters?.search,
          status: filters?.status,
          programId: filters?.program_id,
          level: filters?.level,
          facultyName: filters?.faculty_name,
          departmentName: filters?.department_name,
          majorProgramId: filters?.major_program_id,
          page: filters?.page,
          limit: filters?.limit ?? 100,
        },
      }
    )
    return { data: res.data.map(mapStudent), total: res.meta.total }
  },

  async getStudentById(id: number): Promise<ApiSingleResponse<Student>> {
    const res = await apiClient.get<{ data: WireStudent }>(
      `/users/students/${id}`,
      AUTH
    )
    return { data: mapStudent(res.data) }
  },

  // GET /users/students/matric/:matricNumber — Admin, Staff. Direct lookup
  // by matric number (e.g. "CSC/2025/001"); 404s if no Student has it. The
  // matric may contain "/", so it's URL-encoded. Powers the admin student
  // search's "find by matric" shortcut.
  async getStudentByMatric(
    matricNumber: string
  ): Promise<ApiSingleResponse<Student>> {
    const res = await apiClient.get<{ data: WireStudent }>(
      `/users/students/matric/${encodeURIComponent(matricNumber)}`,
      AUTH
    )
    return { data: mapStudent(res.data) }
  },

  // MISSING_BACKEND_APIS.md §1.1, now shipped by the backend team —
  // resolves the current JWT's own Student.id directly (`/auth/me` only
  // returns User fields, and `/users/students/:id` needs the id already
  // known). Powers `useMyStudentId` and every "my own record" screen.
  async getMyStudent(): Promise<ApiSingleResponse<Student>> {
    // The live API wraps single-resource user-module responses in
    // `{ data: {...} }` — every mapper here expects the bare resource, so
    // unwrap before mapping. (A previously "resolved but null" bug: the 200
    // response came back fine, `mapStudent` just read `id` one level too
    // shallow off the envelope and produced `id: undefined`.)
    const res = await apiClient.get<{ data: WireStudent }>(
      "/users/students/me",
      AUTH
    )
    return { data: mapStudent(res.data) }
  },

  async updateStudent(
    id: number,
    payload: UpdateStudentPayload
  ): Promise<ApiSingleResponse<Student>> {
    const res = await apiClient.patch<{ data: WireStudent }>(
      `/users/students/${id}`,
      {
        currentLevelId: payload.current_level_id,
        modeOfStudy: payload.mode_of_study,
        status: payload.status,
        contactAddress: payload.contact_address,
        phoneNumber: payload.phone_number,
      },
      AUTH
    )
    return { data: mapStudent(res.data), message: "Student updated" }
  },

  /* ── Tutors (Lecturers) ── */
  // `facultyName`/`departmentName` filters per MISSING_BACKEND_APIS.md §2.8,
  // now shipped by the backend team.
  async listTutors(
    filters?: UserQueryFilters
  ): Promise<ApiListResponse<Tutor>> {
    const res = await apiClient.get<ApiPaginatedResponse<WireLecturer>>(
      "/users/lecturers",
      {
        ...AUTH,
        params: {
          search: filters?.search,
          isActive: filters?.is_active,
          facultyName: filters?.faculty_name,
          departmentName: filters?.department_name,
          majorProgramId: filters?.major_program_id,
          page: filters?.page,
          limit: filters?.limit ?? 100,
        },
      }
    )
    return { data: res.data.map(mapTutor), total: res.meta.total }
  },

  async getTutorById(id: number): Promise<ApiSingleResponse<Tutor>> {
    const res = await apiClient.get<{ data: WireLecturer }>(
      `/users/lecturers/${id}`,
      AUTH
    )
    return { data: mapTutor(res.data) }
  },

  // MISSING_BACKEND_APIS.md §1.1b, now shipped by the backend team — mirrors
  // getMyStudent(): resolves the current JWT's own Lecturer.id, needed to
  // look up "my assigned courses" via getTutorCourses.
  async getMyLecturer(): Promise<ApiSingleResponse<Tutor>> {
    const res = await apiClient.get<{ data: WireLecturer }>(
      "/users/lecturers/me",
      AUTH
    )
    return { data: mapTutor(res.data) }
  },

  // PATCH /users/lecturers/me/onboarding — Lecturer (self). Marks one
  // onboarding step done; idempotent, no un-complete. Returns the full
  // progress object.
  async updateMyOnboarding(
    step: TutorOnboardingStep
  ): Promise<TutorOnboardingProgress> {
    const res = await apiClient.patch<{ data: TutorOnboardingProgress }>(
      "/users/lecturers/me/onboarding",
      { step },
      AUTH
    )
    return res.data
  },

  // POST /users/lecturers/:id/resend-invite — Admin, HOD. Regenerates a
  // random password, flags mustResetPassword, revokes sessions, resends the
  // welcome email. Never returns the password.
  async resendTutorInvite(
    lecturerId: number,
    opts: { login_url?: string; template_id?: number } = {}
  ): Promise<{
    userId: number
    email: string
    emailSent: boolean
    sentAt: string | null
    emailError?: string
  }> {
    const res = await apiClient.post<{
      data: {
        userId: number
        email: string
        emailSent: boolean
        sentAt: string | null
        emailError?: string
      }
    }>(
      `/users/lecturers/${lecturerId}/resend-invite`,
      {
        loginUrl: opts.login_url || undefined,
        templateId: opts.template_id,
      },
      AUTH
    )
    return res.data
  },

  async createTutor(
    payload: CreateTutorPayload
  ): Promise<ApiSingleResponse<Tutor>> {
    const res = await apiClient.post<{ data: WireLecturer }>(
      "/users/lecturers",
      {
        userId: payload.user_id,
        firstName: payload.first_name,
        middleName: payload.middle_name,
        lastName: payload.last_name,
        phoneNumber: payload.phone_number,
        staffNumber: payload.staff_number,
        departmentId: payload.department_id,
        designation: payload.designation,
        specialization: payload.specialization,
        officeLocation: payload.office_location,
        officePhone: payload.office_phone,
        dateOfBirth: payload.date_of_birth,
        gender: payload.gender,
        nationality: payload.nationality,
        stateOfOrigin: payload.state_of_origin,
        qualifications: payload.qualifications,
        researchAreas: payload.research_areas,
        bio: payload.bio,
      },
      AUTH
    )
    return { data: mapTutor(res.data), message: "Tutor created" }
  },

  async updateTutor(
    id: number,
    payload: UpdateTutorPayload
  ): Promise<ApiSingleResponse<Tutor>> {
    const res = await apiClient.patch<{ data: WireLecturer }>(
      `/users/lecturers/${id}`,
      {
        designation: payload.designation,
        specialization: payload.specialization,
        officeLocation: payload.office_location,
        officePhone: payload.office_phone,
        qualifications: payload.qualifications,
        researchAreas: payload.research_areas,
        bio: payload.bio,
      },
      AUTH
    )
    return { data: mapTutor(res.data), message: "Tutor updated" }
  },

  /* ── Staff ── */
  async listStaff(filters?: UserQueryFilters): Promise<ApiListResponse<Staff>> {
    const res = await apiClient.get<ApiPaginatedResponse<WireStaff>>(
      "/users/staff",
      {
        ...AUTH,
        params: {
          search: filters?.search,
          isActive: filters?.is_active,
          page: filters?.page,
          limit: filters?.limit ?? 100,
        },
      }
    )
    return { data: res.data.map(mapStaff), total: res.meta.total }
  },

  async getStaffById(id: number): Promise<ApiSingleResponse<Staff>> {
    const res = await apiClient.get<{ data: WireStaff }>(
      `/users/staff/${id}`,
      AUTH
    )
    return { data: mapStaff(res.data) }
  },

  // `roleId` is sent defensively — user_README.md's CreateStaffDto doesn't list it (the
  // backend "assigns the appropriate staff role" on its own per that doc), but the create
  // form lets an admin pick one via the real `/auth/roles` list (see getStaffEligibleRoles
  // below) since the mock this replaces always required a role choice. Confirm with
  // backend whether `roleId` is honored or ignored — see MISSING_BACKEND_APIS.md.
  async createStaff(
    payload: CreateStaffPayload
  ): Promise<ApiSingleResponse<Staff>> {
    const res = await apiClient.post<{ data: WireStaff }>(
      "/users/staff",
      {
        userId: payload.user_id,
        firstName: payload.first_name,
        middleName: payload.middle_name,
        lastName: payload.last_name,
        phoneNumber: payload.phone_number,
        staffNumber: payload.staff_number,
        departmentId: payload.department_id,
        designation: payload.designation,
        jobTitle: payload.job_title,
        roleId: payload.role_id,
        officeLocation: payload.office_location,
        officePhone: payload.office_phone,
        dateOfBirth: payload.date_of_birth,
        gender: payload.gender,
        nationality: payload.nationality,
        stateOfOrigin: payload.state_of_origin,
      },
      AUTH
    )
    return { data: mapStaff(res.data), message: "Staff created" }
  },

  async updateStaff(
    id: number,
    payload: UpdateStaffPayload
  ): Promise<ApiSingleResponse<Staff>> {
    const res = await apiClient.patch<{ data: WireStaff }>(
      `/users/staff/${id}`,
      {
        designation: payload.designation,
        jobTitle: payload.job_title,
        officeLocation: payload.office_location,
        officePhone: payload.office_phone,
      },
      AUTH
    )
    return { data: mapStaff(res.data), message: "Staff updated" }
  },

  /* ── Course Offerings / Tutor Course Assignment ──
   * Assign/remove are real, existing endpoints (bruno/course "Offering Lecturer -
   * Assign/Remove"). Listing "which offerings is this tutor assigned to" is the
   * `lecturerId` filter on `GET /courses/offerings` (MISSING_BACKEND_APIS.md
   * §"Course Offering — lecturerId filter"). Session/semester display names are
   * resolved from `GET /academic-calendar` in a parallel request — the offering
   * endpoint itself only returns the term ids. */
  async listCourseOfferings(): Promise<ApiListResponse<CourseOffering>> {
    const [res, terms] = await Promise.all([
      apiClient.get<ApiListResponse<WireCourseOffering>>(
        "/courses/offerings",
        AUTH
      ),
      fetchAcademicTermNames(),
    ])
    const list = res.data ?? []
    return {
      data: list.map((o) => mapCourseOffering(o, terms)),
      total: res.total ?? list.length,
    }
  },

  async getTutorCourses(
    tutorId: number
  ): Promise<ApiListResponse<TutorCourseAssignment>> {
    const [res, terms] = await Promise.all([
      apiClient.get<ApiListResponse<WireCourseOffering>>("/courses/offerings", {
        ...AUTH,
        params: { lecturerId: tutorId },
      }),
      fetchAcademicTermNames(),
    ])
    const assignments = (res.data ?? []).map((o) => ({
      id: o.id,
      offering_id: o.id,
      tutor_id: tutorId,
      role: o.role ?? "primary",
      created_at: o.assignedAt ?? new Date().toISOString(),
      offering: mapCourseOffering(o, terms),
    }))
    return { data: assignments, total: assignments.length }
  },

  async assignCourse(
    payload: AssignCoursePayload
  ): Promise<ApiSingleResponse<TutorCourseAssignment>> {
    await apiClient.post(
      `/courses/offerings/${payload.offering_id}/lecturers`,
      {
        lecturerId: payload.tutor_id,
        role: payload.role ?? "primary",
      },
      AUTH
    )
    const [offering, terms] = await Promise.all([
      apiClient.get<{ data: WireCourseOffering }>(
        `/courses/offerings/${payload.offering_id}`,
        AUTH
      ),
      fetchAcademicTermNames(),
    ])
    return {
      data: {
        id: payload.offering_id,
        offering_id: payload.offering_id,
        tutor_id: payload.tutor_id,
        role: payload.role ?? "primary",
        created_at: new Date().toISOString(),
        offering: mapCourseOffering(offering.data, terms),
      },
      message: "Course assigned",
    }
  },

  async unassignCourse(
    payload: UnassignCoursePayload
  ): Promise<ApiSingleResponse<null>> {
    await apiClient.delete(
      `/courses/offerings/${payload.offering_id}/lecturers/${payload.tutor_id}`,
      AUTH
    )
    return { data: null, message: "Course unassigned" }
  },

  /* ── Stats ──
   * MISSING_BACKEND_APIS.md §"GET /users/stats", now shipped by the backend
   * team. `useUserStats` surfaces a request error like any other failed
   * query if this ever fails (no client-side fallback computation, per the
   * "don't fake it" convention used across this module).
   *
   * CORRECTION (2026-09-12): the original mapping below assumed flat
   * `totalStudents`/`totalTutors`/`totalStaff` fields — confirmed live via
   * GET /users/stats (SUPER_ADMIN token) that the real backend never sends
   * those; it sends `byRole: Record<UserRoleSlug, number>` instead (e.g.
   * `{ student: 12, tutor: 3, staff: 3, admin: 5, ... }`). The old mapping
   * silently read `undefined` for all three and the Summary page's "User
   * Distribution" widget showed 0 for every role despite a correct
   * non-zero total — found via a full browser QA sweep, not reported by a
   * user. Also picked up the real `inactiveUsers` field the backend
   * provides directly instead of only deriving it client-side. */
  async getStats(): Promise<ApiSingleResponse<UserStats>> {
    const res = await apiClient.get<{
      data: {
        totalUsers: number
        activeUsers: number
        inactiveUsers?: number
        byRole?: Record<string, number>
        byFaculty?: {
          facultyId: number
          facultyName: string
          students: number
          tutors: number
        }[]
        studentsByLevel?: { level: number; count: number }[]
        studentsByGender?: { male: number; female: number }
        tutorsByDesignation?: { designation: string; count: number }[]
      }
    }>("/users/stats", AUTH)
    const byRole = res.data.byRole ?? {}
    return {
      data: {
        total_users: res.data.totalUsers,
        total_students: byRole.student ?? 0,
        total_tutors: byRole.tutor ?? 0,
        total_staff: byRole.staff ?? 0,
        active_users: res.data.activeUsers,
        by_faculty: res.data.byFaculty?.map((f) => ({
          faculty_id: f.facultyId,
          faculty_name: f.facultyName,
          students: f.students,
          tutors: f.tutors,
        })),
        students_by_level: res.data.studentsByLevel,
        students_by_gender: res.data.studentsByGender,
        tutors_by_designation: res.data.tutorsByDesignation,
      },
    }
  },

  /* ── Eligible Roles (for staff creation) ──
   * Sourced from the real /auth/roles list, excluding roles assigned through their own
   * dedicated flow (student via admission, tutor via "Add Tutor" above). */
  async getStaffEligibleRoles(): Promise<ApiListResponse<EligibleRole>> {
    const res = await apiClient.get<
      ApiListResponse<{
        id: number
        name: string
        slug: string
        description: string | null
      }>
    >("/auth/roles", AUTH)
    const eligible = res.data.filter(
      (r) => r.slug !== "student" && r.slug !== "tutor"
    )
    return { data: eligible, total: eligible.length }
  },

  /* ── Bulk Import (super_admin/admin/hod) ──
   * Real endpoint per tutor_onboarding_README.md §1 —
   * `sendWelcomeEmail`/`loginUrl`/`templateId` are supported by the backend.
   * `contentType: "multipart"` lets apiClient serialize this plain object to
   * FormData (File passed through, boolean → "1"/"0", empty fields dropped). */
  async bulkImportTutors(
    payload: BulkImportTutorsPayload,
    onUploadProgress?: (percent: number) => void
  ): Promise<ApiSingleResponse<BulkImportResult>> {
    const raw = await apiClient.post<{
      data: {
        total: number
        succeeded: number
        failed: number
        results: WireBulkImportRow[]
      }
    }>(
      "/users/bulk-import",
      {
        file: payload.file,
        sendWelcomeEmail: payload.send_welcome_email,
        loginUrl: payload.login_url || undefined,
        templateId: payload.template_id,
      },
      { ...AUTH, contentType: "multipart", onUploadProgress }
    )

    return {
      data: {
        total: raw.data.total,
        succeeded: raw.data.succeeded,
        failed: raw.data.failed,
        results: raw.data.results.map(mapBulkImportRow),
      },
    }
  },
}

// ── Query keys ──────────────────────────────

export const usersKeys = {
  all: ["users"] as const,
  list: (filters?: UserQueryFilters) =>
    [...usersKeys.all, "list", filters ?? {}] as const,
  detail: (id: number) => [...usersKeys.all, "detail", id] as const,
  stats: () => [...usersKeys.all, "stats"] as const,
  students: {
    all: [...["users"], "students"] as const,
    list: (filters?: StudentQueryFilters) =>
      [...usersKeys.students.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...usersKeys.students.all, "detail", id] as const,
    me: () => [...usersKeys.students.all, "me"] as const,
  },
  tutors: {
    all: [...["users"], "tutors"] as const,
    list: (filters?: UserQueryFilters) =>
      [...usersKeys.tutors.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...usersKeys.tutors.all, "detail", id] as const,
    courses: (id: number) => [...usersKeys.tutors.all, "courses", id] as const,
    me: () => [...usersKeys.tutors.all, "me"] as const,
  },
  staff: {
    all: [...["users"], "staff"] as const,
    list: (filters?: UserQueryFilters) =>
      [...usersKeys.staff.all, "list", filters ?? {}] as const,
    detail: (id: number) => [...usersKeys.staff.all, "detail", id] as const,
  },
  eligibleRoles: () => [...usersKeys.all, "eligible-roles"] as const,
  bulkImportTutors: () => [...usersKeys.tutors.all, "bulk-import"] as const,
}

// ── Query options ───────────────────────────

export const usersQueryOptions = {
  list: (filters?: UserQueryFilters) =>
    createApiQueryOptions({
      queryKey: usersKeys.list(filters),
      queryFn: () => usersApi.listUsers(filters),
    }),
  detail: (id: number) =>
    createApiQueryOptions({
      queryKey: usersKeys.detail(id),
      queryFn: () => usersApi.getUserById(id),
    }),
  stats: () =>
    createApiQueryOptions({
      queryKey: usersKeys.stats(),
      queryFn: () => usersApi.getStats(),
    }),
  students: {
    list: (filters?: StudentQueryFilters) =>
      createApiQueryOptions({
        queryKey: usersKeys.students.list(filters),
        queryFn: () => usersApi.listStudents(filters),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: usersKeys.students.detail(id),
        queryFn: () => usersApi.getStudentById(id),
      }),
  },
  tutors: {
    list: (filters?: UserQueryFilters) =>
      createApiQueryOptions({
        queryKey: usersKeys.tutors.list(filters),
        queryFn: () => usersApi.listTutors(filters),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: usersKeys.tutors.detail(id),
        queryFn: () => usersApi.getTutorById(id),
      }),
    courses: (id: number) =>
      createApiQueryOptions({
        queryKey: usersKeys.tutors.courses(id),
        queryFn: () => usersApi.getTutorCourses(id),
      }),
  },
  courseOfferings: () =>
    createApiQueryOptions({
      queryKey: [...usersKeys.all, "course-offerings"] as const,
      queryFn: () => usersApi.listCourseOfferings(),
    }),
  staff: {
    list: (filters?: UserQueryFilters) =>
      createApiQueryOptions({
        queryKey: usersKeys.staff.list(filters),
        queryFn: () => usersApi.listStaff(filters),
      }),
    detail: (id: number) =>
      createApiQueryOptions({
        queryKey: usersKeys.staff.detail(id),
        queryFn: () => usersApi.getStaffById(id),
      }),
  },
  staffEligibleRoles: () =>
    createApiQueryOptions({
      queryKey: usersKeys.eligibleRoles(),
      queryFn: () => usersApi.getStaffEligibleRoles(),
    }),
}

// ── Mutation options ────────────────────────

export const usersMutationOptions = {
  setActive: () =>
    createApiMutationOptions<
      ApiSingleResponse<User>,
      { id: number; isActive: boolean }
    >({
      mutationKey: [...usersKeys.all, "set-active"],
      mutationFn: ({ id, isActive }) => usersApi.setUserActive(id, isActive),
    }),
  updateStudent: () =>
    createApiMutationOptions<
      ApiSingleResponse<Student>,
      { id: number; payload: UpdateStudentPayload }
    >({
      mutationKey: [...usersKeys.students.all, "update"],
      mutationFn: ({ id, payload }) => usersApi.updateStudent(id, payload),
    }),
  createTutor: () =>
    createApiMutationOptions<ApiSingleResponse<Tutor>, CreateTutorPayload>({
      mutationKey: [...usersKeys.tutors.all, "create"],
      mutationFn: (payload) => usersApi.createTutor(payload),
    }),
  updateTutor: () =>
    createApiMutationOptions<
      ApiSingleResponse<Tutor>,
      { id: number; payload: UpdateTutorPayload }
    >({
      mutationKey: [...usersKeys.tutors.all, "update"],
      mutationFn: ({ id, payload }) => usersApi.updateTutor(id, payload),
    }),
  assignCourse: () =>
    createApiMutationOptions<
      ApiSingleResponse<TutorCourseAssignment>,
      AssignCoursePayload
    >({
      mutationKey: [...usersKeys.tutors.all, "assign-course"],
      mutationFn: (payload) => usersApi.assignCourse(payload),
    }),
  unassignCourse: () =>
    createApiMutationOptions<ApiSingleResponse<null>, UnassignCoursePayload>({
      mutationKey: [...usersKeys.tutors.all, "unassign-course"],
      mutationFn: (payload) => usersApi.unassignCourse(payload),
    }),
  // The CSV can be several MB, so the caller may pass a progress callback to
  // drive an upload bar rather than an indefinite spinner.
  bulkImportTutors: (onUploadProgress?: (percent: number) => void) =>
    createApiMutationOptions<
      ApiSingleResponse<BulkImportResult>,
      BulkImportTutorsPayload
    >({
      mutationKey: usersKeys.bulkImportTutors(),
      mutationFn: (payload) =>
        usersApi.bulkImportTutors(payload, onUploadProgress),
    }),
  createStaff: () =>
    createApiMutationOptions<ApiSingleResponse<Staff>, CreateStaffPayload>({
      mutationKey: [...usersKeys.staff.all, "create"],
      mutationFn: (payload) => usersApi.createStaff(payload),
    }),
  updateStaff: () =>
    createApiMutationOptions<
      ApiSingleResponse<Staff>,
      { id: number; payload: UpdateStaffPayload }
    >({
      mutationKey: [...usersKeys.staff.all, "update"],
      mutationFn: ({ id, payload }) => usersApi.updateStaff(id, payload),
    }),
}
