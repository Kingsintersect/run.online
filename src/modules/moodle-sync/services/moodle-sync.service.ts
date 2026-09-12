import apiClient from "@/lib/clients/apiClient"
import { academicUnitsApi } from "@/services/academicStructureApi"
import type {
  CategorySyncResponse,
  CoursesBulkPushPayload,
  CourseSyncResponse,
  EnrollmentSyncResponse,
  PushCategoryDto,
  ResolveCategoryMappingDto,
  UserSyncQueryFilters,
  UserSyncResponse,
  UsersBulkPushPayload,
  PullUsersResult,
  UnmatchedMoodleUser,
  CohortSyncResponse,
  PushCohortDto,
  SyncCohortMembersResult,
  AssessmentResponse,
  AssessmentFilter,
  PaginatedAssessments,
  UpdateVisibilityPayload,
  VisibilityResponse,
  AssessmentSyncResult,
  AssessmentSyncStatusResult,
  CaPreviewResponse,
  GradeResponse,
  CalendarEventResponse,
} from "../types"

// Real backend contract per bruno/moodle-sync/*.bru (the sole source of truth
// for this module — see CLAUDE.md §13). List/detail GETs are wrapped in a
// `{ data: ... }` envelope (confirmed by every List .bru's
// `res.body.data[0].id` post-response script).
//
// Push actions are NOT uniformly wrapped or unwrapped — this varies per
// endpoint, confirmed per-endpoint via each Push .bru's post-response
// script, not assumed module-wide:
//   - Category Sync - Push.bru reads `res.body.data.id`   -> WRAPPED
//   - Course Sync - Push.bru reads `res.body.id`           -> unwrapped
//   - Enrollment Sync - Push.bru reads `res.body.moodleEnrollmentId` -> unwrapped
//   - User Sync - Push.bru reads `res.body.id`             -> unwrapped
// CORRECTION (2026-09-12): this comment previously claimed ALL push actions
// were unwrapped "confirmed by the Push .bru files reading res.body.id
// directly" — that was wrong; it only checked one of the four and
// generalized. `pushCategory` was fixed to unwrap `{ data: ... }`; the
// three above remain unwrapped as before, since their own bru scripts
// still confirm that shape.
const BASE = "/moodle-sync"
const AUTH = { access_token: true } as const

// Raw wire shape for category-sync rows — the real backend only returns the
// mapping row itself (academicUnitId + Moodle-side fields); `unitName`/
// `unitTypeCode`/`parentId` on CategorySyncResponse are enriched client-side
// by joining against the AcademicUnit tree (mapCategorySync below), the same
// "Frontend Contract Additions" pattern the old entityType/entityId scheme
// used. See sandbox/schema-moodel-sync-refactor/api-v2.md §"Moodle Category
// Sync" and MISSING_BACKEND_APIS.md §2.16.
interface RawCategorySync {
  id: number
  academicUnitId: number
  moodleCategoryId: number | null
  moodleCategoryName: string | null
  parentMoodleCategoryId: number | null
  syncStatus: CategorySyncResponse["syncStatus"]
  syncDirection: CategorySyncResponse["syncDirection"]
  needsMapping: boolean
  syncError: string | null
  lastSyncAt: string | null
}

function mapCategorySync(
  raw: RawCategorySync,
  unitsById: Map<
    number,
    { name: string; typeCode: string; parentId: number | null }
  >
): CategorySyncResponse {
  const unit = unitsById.get(raw.academicUnitId)
  return {
    id: raw.id,
    academicUnitId: raw.academicUnitId,
    unitName: unit?.name ?? `Unit #${raw.academicUnitId}`,
    unitTypeCode: unit?.typeCode ?? "UNKNOWN",
    parentId: unit?.parentId ?? null,
    moodleCategoryId: raw.moodleCategoryId,
    moodleCategoryName: raw.moodleCategoryName,
    parentMoodleCategoryId: raw.parentMoodleCategoryId,
    syncStatus: raw.syncStatus,
    syncDirection: raw.syncDirection,
    needsMapping: raw.needsMapping,
    syncError: raw.syncError,
    lastSyncAt: raw.lastSyncAt,
  }
}

async function buildUnitLookup(): Promise<
  Map<number, { name: string; typeCode: string; parentId: number | null }>
> {
  const res = await academicUnitsApi.list()
  return new Map(
    res.data.map((u) => [
      u.id,
      { name: u.name, typeCode: u.typeCode, parentId: u.parentId },
    ])
  )
}

// ── Assessment wire shapes + normalizers ──────────────────────────────────────
// Verified against the live backend 2026-09-10 — see the "Assessments" section
// of `moodleSyncService` below for why every call goes to `/assessments/*`.

// List / my / upcoming / course/:id — flat course object.
interface RawAssessmentListItem {
  id: number
  assessmentType: AssessmentResponse["assessmentType"]
  name: string
  description?: string | null
  dueDate?: string | null
  maxGrade?: number | null
  isVisible?: boolean
  course?: { code?: string; title?: string; semesterName?: string | null }
}

// GET /assessments/:id — deep course object + sync metadata.
interface RawAssessmentDetail {
  id: number
  assessmentType: AssessmentResponse["assessmentType"]
  name: string
  description?: string | null
  dueDate?: string | null
  maxGrade?: number | null
  isVisible?: boolean
  moodleSyncCourseId?: number | null
  moodleAssessmentId?: number | null
  lastSyncAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  course?: {
    id?: number
    moodleCourseId?: number
    moodleShortName?: string
    moodleFullName?: string
    courseOffering?: {
      course?: { code?: string; title?: string }
      semester?: { name?: string }
      academicSession?: { name?: string }
    }
  }
}

function mapAssessmentListItem(raw: RawAssessmentListItem): AssessmentResponse {
  return {
    id: raw.id,
    assessmentType: raw.assessmentType,
    name: raw.name,
    description: raw.description ?? null,
    dueDate: raw.dueDate ?? null,
    maxGrade: raw.maxGrade ?? null,
    isVisible: raw.isVisible ?? true,
    courseCode: raw.course?.code ?? "—",
    courseTitle: raw.course?.title ?? "Untitled course",
    semesterName: raw.course?.semesterName ?? null,
    academicSessionName: null,
    moodleSyncCourseId: null,
    moodleAssessmentId: null,
    moodleShortName: null,
    moodleFullName: null,
    lastSyncAt: null,
    createdAt: null,
    updatedAt: null,
  }
}

function mapAssessmentDetail(raw: RawAssessmentDetail): AssessmentResponse {
  const offering = raw.course?.courseOffering
  return {
    id: raw.id,
    assessmentType: raw.assessmentType,
    name: raw.name,
    description: raw.description ?? null,
    dueDate: raw.dueDate ?? null,
    maxGrade: raw.maxGrade ?? null,
    isVisible: raw.isVisible ?? true,
    courseCode: offering?.course?.code ?? "—",
    courseTitle: offering?.course?.title ?? "Untitled course",
    semesterName: offering?.semester?.name ?? null,
    academicSessionName: offering?.academicSession?.name ?? null,
    moodleSyncCourseId: raw.course?.id ?? raw.moodleSyncCourseId ?? null,
    moodleAssessmentId: raw.moodleAssessmentId ?? null,
    moodleShortName: raw.course?.moodleShortName ?? null,
    moodleFullName: raw.course?.moodleFullName ?? null,
    lastSyncAt: raw.lastSyncAt ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

// `/assessments/sync/status` docs give `{ summary, courses }`; the older
// `/moodle-sync/...` route gave `{ data: { totalAssessments, totalSyncedCourses,
// coursesByStatus, lastSyncAt } }` with no per-course rows. Accept either.
function normalizeAssessmentSyncStatus(
  res: Record<string, unknown>
): AssessmentSyncStatusResult {
  const body = (
    "data" in res && res.data && typeof res.data === "object" ? res.data : res
  ) as Record<string, unknown>

  const summaryRaw = (body.summary ?? body) as Record<string, unknown>
  const byStatusRaw = (summaryRaw.byStatus ??
    body.coursesByStatus ??
    {}) as Record<string, number>
  const coursesRaw = Array.isArray(body.courses)
    ? (body.courses as Record<string, unknown>[])
    : []

  return {
    summary: {
      totalCourses: Number(
        summaryRaw.totalCourses ?? body.totalSyncedCourses ?? coursesRaw.length
      ),
      totalAssessments: Number(
        summaryRaw.totalAssessments ?? body.totalAssessments ?? 0
      ),
      byStatus: {
        SYNCED: Number(byStatusRaw.SYNCED ?? 0),
        PENDING: Number(byStatusRaw.PENDING ?? 0),
        FAILED: Number(byStatusRaw.FAILED ?? 0),
        STALE: Number(byStatusRaw.STALE ?? 0),
      },
    },
    courses: coursesRaw.map((c) => ({
      courseOfferingId: Number(c.courseOfferingId ?? 0),
      courseCode: String(c.courseCode ?? "—"),
      moodleCourseId: Number(c.moodleCourseId ?? 0),
      assessmentCount: Number(c.assessmentCount ?? 0),
      lastSyncAt: (c.lastSyncAt as string | null) ?? null,
      failedCount: Number(c.failedCount ?? 0),
    })),
  }
}

export const moodleSyncService = {
  // ---------- Categories ----------

  async listCategories(): Promise<CategorySyncResponse[]> {
    const [res, unitsById] = await Promise.all([
      apiClient.get<{ data: RawCategorySync[] }>(`${BASE}/categories`, AUTH),
      buildUnitLookup(),
    ])
    return res.data.map((r) => mapCategorySync(r, unitsById))
  },

  async getCategoriesNeedingMapping(): Promise<CategorySyncResponse[]> {
    const [res, unitsById] = await Promise.all([
      apiClient.get<{ data: RawCategorySync[] }>(
        `${BASE}/categories/needs-mapping`,
        AUTH
      ),
      buildUnitLookup(),
    ])
    return res.data.map((r) => mapCategorySync(r, unitsById))
  },

  async getCategory(id: number): Promise<CategorySyncResponse> {
    const [res, unitsById] = await Promise.all([
      apiClient.get<{ data: RawCategorySync }>(
        `${BASE}/categories/${id}`,
        AUTH
      ),
      buildUnitLookup(),
    ])
    return mapCategorySync(res.data, unitsById)
  },

  // Confirmed wrapped by Category Sync - Push.bru's post-response script
  // (`res.body.data.id`) — see the file header correction.
  async pushCategory(dto: PushCategoryDto): Promise<RawCategorySync> {
    const res = await apiClient.post<{ data: RawCategorySync }>(
      `${BASE}/categories/push`,
      dto,
      AUTH
    )
    return res.data
  },

  // Replaces the old faculty-only pushHierarchy — any AcademicUnit can be a
  // subtree root now (a whole Faculty, or just one Program's Level/Semester
  // branch), pushed breadth-first. See api-v2.md
  // §"POST /moodle-sync/categories/push-subtree/{rootUnitId}".
  pushSubtree: (rootUnitId: number) =>
    apiClient.post<RawCategorySync[]>(
      `${BASE}/categories/push-subtree/${rootUnitId}`,
      undefined,
      AUTH
    ),

  pullCategories: () =>
    apiClient.post<{
      matchedByIdnumber: number
      updated: number
      needsMapping: number
    }>(`${BASE}/categories/pull`, undefined, AUTH),

  pullCategory: (moodleCategoryId: number) =>
    apiClient.post<RawCategorySync>(
      `${BASE}/categories/pull/${moodleCategoryId}`,
      undefined,
      AUTH
    ),

  resolveCategoryMapping: (id: number, dto: ResolveCategoryMappingDto) =>
    apiClient.post<RawCategorySync>(
      `${BASE}/categories/${id}/resolve`,
      dto,
      AUTH
    ),

  deleteCategoryMapping: (id: number) =>
    apiClient.delete<{ message: string }>(`${BASE}/categories/${id}`, AUTH),

  // ---------- Cohorts (Multi-Program Platform, not yet shipped) ----------
  // A cohort is Program + AcademicSession (+ Level) — not a new concept,
  // pushed to Moodle as a real cohort so shared courses can use Moodle's
  // own "Cohort sync" enrolment method for auto-enrol/auto-unenrol.
  // Membership itself isn't managed through these endpoints — it's driven
  // automatically off the existing StudentEnrollment lifecycle on the
  // backend; sync-members is a manual drift-reconciliation action. See
  // sandbox/multi-program-platform/{API_CONTRACTS,MOODLE_COHORT_SYNC}.md.

  async listCohorts(): Promise<CohortSyncResponse[]> {
    const res = await apiClient.get<{ data: CohortSyncResponse[] }>(
      `${BASE}/cohorts`,
      AUTH
    )
    return res.data
  },

  // CORRECTION (2026-09-12): both of these were previously typed as
  // unwrapped "matching pushCategory's convention" — that premise was
  // itself wrong (see pushCategory above and the file header). Per
  // confirmation from the backend team, `CategorySyncController::push()`
  // wraps in `{ data: ... }`, and `CohortSyncController` (push and
  // sync-members) was correctly built to match that real behavior. Fixed
  // to unwrap here to match. See sandbox/multi-program-platform/
  // API_CONTRACTS.md §C for the corrected contract.
  async pushCohort(dto: PushCohortDto): Promise<CohortSyncResponse> {
    const res = await apiClient.post<{ data: CohortSyncResponse }>(
      `${BASE}/cohorts/push`,
      dto,
      AUTH
    )
    return res.data
  },

  async syncCohortMembers(id: number): Promise<SyncCohortMembersResult> {
    const res = await apiClient.post<{ data: SyncCohortMembersResult }>(
      `${BASE}/cohorts/${id}/sync-members`,
      undefined,
      AUTH
    )
    return res.data
  },

  // ---------- Users ----------

  async listUsers(
    filters: UserSyncQueryFilters = {}
  ): Promise<UserSyncResponse[]> {
    const res = await apiClient.get<{ data: UserSyncResponse[] }>(
      `${BASE}/users`,
      { ...AUTH, params: filters as Record<string, unknown> }
    )
    return res.data
  },

  async getUserMapping(id: number): Promise<UserSyncResponse> {
    const res = await apiClient.get<{ data: UserSyncResponse }>(
      `${BASE}/users/${id}`,
      AUTH
    )
    return res.data
  },

  async getUserMappingByUserId(userId: number): Promise<UserSyncResponse> {
    const res = await apiClient.get<{ data: UserSyncResponse }>(
      `${BASE}/users/user/${userId}`,
      AUTH
    )
    return res.data
  },

  pushUser: (userId: number) =>
    apiClient.post<UserSyncResponse>(
      `${BASE}/users/push/${userId}`,
      undefined,
      AUTH
    ),

  pushUsersBulk: ({ userIds }: UsersBulkPushPayload) =>
    apiClient.post<{ pushed: number; skipped: number }>(
      `${BASE}/users/push-bulk`,
      { userIds },
      AUTH
    ),

  // Unlike single-record push/pull actions, this bulk summary IS wrapped in
  // a `{ data: ... }` envelope — confirmed via a live capture of
  // `POST /users/pull`'s response, which included the `unmatched` list of
  // Moodle users with no matching portal account.
  async pullUsers(): Promise<PullUsersResult> {
    const res = await apiClient.post<{ data: PullUsersResult }>(
      `${BASE}/users/pull`,
      undefined,
      AUTH
    )
    return res.data
  },

  pullUser: (moodleUserId: number) =>
    apiClient.post<UserSyncResponse>(
      `${BASE}/users/pull/${moodleUserId}`,
      undefined,
      AUTH
    ),

  // GET /moodle-sync/users/unmatched — Admin. Read-only preview of the same
  // `unmatched[]` array that `POST /users/pull` returns, but without writing
  // anything. Lets the admin see standing unmatched Moodle accounts without
  // having to re-run a pull. List GET → `{ data: ... }` envelope.
  async getUnmatchedUsers(): Promise<UnmatchedMoodleUser[]> {
    const res = await apiClient.get<{ data: UnmatchedMoodleUser[] }>(
      `${BASE}/users/unmatched`,
      AUTH
    )
    return res.data
  },

  // ---------- Courses ----------

  async listCourses(): Promise<CourseSyncResponse[]> {
    const res = await apiClient.get<{ data: CourseSyncResponse[] }>(
      `${BASE}/courses`,
      AUTH
    )
    return res.data
  },

  async getCourse(id: number): Promise<CourseSyncResponse> {
    const res = await apiClient.get<{ data: CourseSyncResponse }>(
      `${BASE}/courses/${id}`,
      AUTH
    )
    return res.data
  },

  pushCourse: (courseOfferingId: number) =>
    apiClient.post<CourseSyncResponse>(
      `${BASE}/courses/push/${courseOfferingId}`,
      undefined,
      AUTH
    ),

  // Bruno's body field is `offeringIds`, not `courseOfferingIds` — translated
  // here so the frontend-facing payload type can keep its clearer name.
  pushCoursesBulk: ({ courseOfferingIds }: CoursesBulkPushPayload) =>
    apiClient.post<{ pushed: number }>(
      `${BASE}/courses/push-bulk`,
      { offeringIds: courseOfferingIds },
      AUTH
    ),

  pullCourses: () =>
    apiClient.post<{ pulled: number; created: number }>(
      `${BASE}/courses/pull`,
      undefined,
      AUTH
    ),

  pullCourse: (moodleCourseId: number) =>
    apiClient.post<CourseSyncResponse>(
      `${BASE}/courses/pull/${moodleCourseId}`,
      undefined,
      AUTH
    ),

  // ---------- Enrollments ----------

  async listEnrollments(
    filters: { status?: string } = {}
  ): Promise<EnrollmentSyncResponse[]> {
    const res = await apiClient.get<{ data: EnrollmentSyncResponse[] }>(
      `${BASE}/enrollments`,
      { ...AUTH, params: filters as Record<string, unknown> }
    )
    return res.data
  },

  async listEnrollmentErrors(): Promise<EnrollmentSyncResponse[]> {
    const res = await apiClient.get<{ data: EnrollmentSyncResponse[] }>(
      `${BASE}/enrollments/errors`,
      AUTH
    )
    return res.data
  },

  pushEnrollment: (enrollmentId: number) =>
    apiClient.post<EnrollmentSyncResponse>(
      `${BASE}/enrollments/push/${enrollmentId}`,
      undefined,
      AUTH
    ),

  pushAllEnrollments: () =>
    apiClient.post<{ pushed: number; failed: number }>(
      `${BASE}/enrollments/push-all`,
      undefined,
      AUTH
    ),

  pullEnrollments: (moodleCourseId: number) =>
    apiClient.post<{ pulled: number }>(
      `${BASE}/enrollments/pull/${moodleCourseId}`,
      undefined,
      AUTH
    ),

  // ---------- Assessments ----------
  // Verified live 2026-09-10 against the running backend: the COMPLETE contract
  // is `/assessments/*` (assesments_README.md / bruno/assessments), NOT
  // `/moodle-sync/assessments/*` — that path only has list/course/upcoming/
  // pull/pull-all/sync-status and 404s on `/my`, `/:id`, `/:id/visibility`,
  // `DELETE /:id`, `/sync/*`. So every method here calls `/assessments/*`.
  //
  // Two wire shapes over one entity, normalized here:
  //   • list / my / upcoming / course/:id  →  flat `course:{code,title,semesterName}`, + `meta`
  //   • GET /assessments/:id (detail)        →  deep `course.courseOffering.{...}` + sync metadata
  // `mapAssessmentListItem` / `mapAssessmentDetail` collapse both into one
  // `AssessmentResponse`.
  //
  // ONLY `ca-preview` (the Moodle CA → Grade.caScore bridge) is genuinely
  // unshipped — see sandbox/API_GAPS_2026-09.md §2.

  listAssessments: async (
    filters: {
      courseId?: number
      type?: string
    } = {}
  ): Promise<{ data: AssessmentResponse[] }> => {
    const res = await apiClient.get<{ data: RawAssessmentListItem[] }>(
      `/assessments`,
      { ...AUTH, params: { offeringId: filters.courseId, type: filters.type } }
    )
    return { data: (res.data ?? []).map(mapAssessmentListItem) }
  },

  listAssessmentsByCourse: async (
    courseOfferingId: number
  ): Promise<{ data: AssessmentResponse[] }> => {
    const res = await apiClient.get<{ data: RawAssessmentListItem[] }>(
      `/assessments/course/${courseOfferingId}`,
      AUTH
    )
    return { data: (res.data ?? []).map(mapAssessmentListItem) }
  },

  listAssessmentsByCourseUpcoming: async (
    courseOfferingId: number
  ): Promise<{ data: AssessmentResponse[] }> => {
    const res = await apiClient.get<{ data: RawAssessmentListItem[] }>(
      `/assessments/course/${courseOfferingId}/upcoming`,
      AUTH
    )
    return { data: (res.data ?? []).map(mapAssessmentListItem) }
  },

  listUpcomingAssessments: async (): Promise<{
    data: AssessmentResponse[]
  }> => {
    const res = await apiClient.get<{ data: RawAssessmentListItem[] }>(
      `/assessments/upcoming`,
      AUTH
    )
    return { data: (res.data ?? []).map(mapAssessmentListItem) }
  },

  pullAssessments: (moodleCourseId: number) =>
    apiClient.post<AssessmentSyncResult>(
      `/assessments/sync/${moodleCourseId}`,
      undefined,
      AUTH
    ),

  pullAllAssessments: () =>
    apiClient.post<{ jobId?: string; message?: string }>(
      `/assessments/sync-all`,
      undefined,
      AUTH
    ),

  async listAssessmentsPaginated(
    filters: Partial<AssessmentFilter> = {}
  ): Promise<PaginatedAssessments> {
    const res = await apiClient.get<{
      data: RawAssessmentListItem[]
      meta?: { total: number; page: number; limit: number }
    }>(`/assessments`, {
      ...AUTH,
      params: {
        type: filters.type,
        offeringId: filters.courseOfferingId,
        semesterId: filters.semesterId,
        isVisible: filters.isVisible,
        upcoming: filters.upcoming,
        page: filters.page,
        limit: filters.limit,
      },
    })
    const data = (res.data ?? []).map(mapAssessmentListItem)
    return {
      data,
      meta: res.meta ?? {
        total: data.length,
        page: filters.page ?? 1,
        limit: filters.limit ?? data.length,
      },
    }
  },

  async getAssessment(id: number): Promise<AssessmentResponse> {
    // Detail is returned FLAT (not `{data}`-wrapped) per the live response.
    const res = await apiClient.get<
      RawAssessmentDetail | { data: RawAssessmentDetail }
    >(`/assessments/${id}`, AUTH)
    const raw = "data" in res ? res.data : res
    return mapAssessmentDetail(raw)
  },

  async getMyAssessments(
    filters: Partial<
      Pick<AssessmentFilter, "type" | "upcoming" | "page" | "limit">
    > = {}
  ): Promise<PaginatedAssessments> {
    const res = await apiClient.get<{
      data: RawAssessmentListItem[]
      meta?: { total: number; page: number; limit: number }
    }>(`/assessments/my`, { ...AUTH, params: filters })
    const data = (res.data ?? []).map(mapAssessmentListItem)
    return {
      data,
      meta: res.meta ?? {
        total: data.length,
        page: filters.page ?? 1,
        limit: filters.limit ?? data.length,
      },
    }
  },

  async updateAssessmentVisibility(
    id: number,
    payload: UpdateVisibilityPayload
  ): Promise<VisibilityResponse> {
    const res = await apiClient.patch<
      VisibilityResponse | { data: VisibilityResponse },
      UpdateVisibilityPayload
    >(`/assessments/${id}/visibility`, payload, AUTH)
    return "data" in res ? res.data : res
  },

  async deleteAssessmentMapping(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/assessments/${id}`, AUTH)
  },

  async getAssessmentSyncStatus(): Promise<AssessmentSyncStatusResult> {
    // `/assessments/sync/status` — Admin. Documented shape is
    // `{ summary: {...}, courses: [...] }`; the older
    // `/moodle-sync/assessments/sync-status` returned a flatter
    // `{ data: { totalAssessments, totalSyncedCourses, coursesByStatus } }`.
    // Normalize both so the table never crashes on a shape change.
    const res = await apiClient.get<Record<string, unknown>>(
      `/assessments/sync/status`,
      AUTH
    )
    return normalizeAssessmentSyncStatus(res)
  },

  // Retry = re-run the pull (upsert-based, idempotent). `/assessments/sync/:id/retry`
  // exists too, but re-calling sync is equivalent and one less path to depend on.
  retryAssessmentSync(moodleCourseId: number): Promise<AssessmentSyncResult> {
    return apiClient.post<AssessmentSyncResult>(
      `/assessments/sync/${moodleCourseId}`,
      undefined,
      AUTH
    )
  },

  // Moodle CA → Grade.caScore bridge. NOT YET SHIPPED (404 on both
  // `/assessments/ca-preview` and `/moodle-sync/assessments/ca-preview` as of
  // 2026-09-10) — sandbox/API_GAPS_2026-09.md §2 has the spec. The
  // "Pull CA from Moodle" button surfaces the error until it lands; manual CA
  // entry works meanwhile.
  async getCaPreview(
    offeringId: number,
    params: { semesterId: number; caMax?: number }
  ): Promise<CaPreviewResponse> {
    const res = await apiClient.get<
      CaPreviewResponse | { data: CaPreviewResponse }
    >(`/assessments/ca-preview/${offeringId}`, { ...AUTH, params })
    return "data" in res ? res.data : res
  },

  // ---------- Grades (read-only) ----------

  listGrades: (filters: { courseId?: number; userId?: number } = {}) =>
    apiClient.get<{ data: GradeResponse[] }>(`${BASE}/grades`, {
      ...AUTH,
      params: { offeringId: filters.courseId, userId: filters.userId },
    }),

  listGradesByStudent: (userId: number) =>
    apiClient.get<{ data: GradeResponse[] }>(
      `${BASE}/grades/student/${userId}`,
      AUTH
    ),

  listGradesByCourse: (courseOfferingId: number) =>
    apiClient.get<{ data: GradeResponse[] }>(
      `${BASE}/grades/course/${courseOfferingId}`,
      AUTH
    ),

  getMyGrades: () =>
    apiClient.get<{ data: GradeResponse[] }>(`${BASE}/grades/my`, AUTH),

  pullGrades: (moodleCourseId: number) =>
    apiClient.post<{ pulled: number }>(
      `${BASE}/grades/pull/${moodleCourseId}`,
      undefined,
      AUTH
    ),

  pullAllGrades: () =>
    apiClient.post<{ pulled: number }>(
      `${BASE}/grades/pull-all`,
      undefined,
      AUTH
    ),

  // ---------- Calendar & Zoom (read-only) ----------

  listCalendarEvents: () =>
    apiClient.get<{ data: CalendarEventResponse[] }>(`${BASE}/calendar`, AUTH),

  listCalendarEventsByCourse: (courseOfferingId: number) =>
    apiClient.get<{ data: CalendarEventResponse[] }>(
      `${BASE}/calendar/course/${courseOfferingId}`,
      AUTH
    ),

  listUpcomingEvents: () =>
    apiClient.get<{ data: CalendarEventResponse[] }>(
      `${BASE}/calendar/upcoming`,
      AUTH
    ),

  async getCalendarEvent(id: number): Promise<CalendarEventResponse> {
    const res = await apiClient.get<{ data: CalendarEventResponse }>(
      `${BASE}/calendar/${id}`,
      AUTH
    )
    return res.data
  },

  pullCalendar: () =>
    apiClient.post<{ pulled: number }>(
      `${BASE}/calendar/pull`,
      undefined,
      AUTH
    ),

  pullCalendarForCourse: (moodleCourseId: number) =>
    apiClient.post<{ pulled: number }>(
      `${BASE}/calendar/pull/${moodleCourseId}`,
      undefined,
      AUTH
    ),
}
