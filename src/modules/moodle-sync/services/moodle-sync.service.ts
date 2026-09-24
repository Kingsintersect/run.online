import apiClient from "@/lib/clients/apiClient"
import { academicUnitsApi } from "@/services/academicStructureApi"
import { offeringsApi } from "@/services/courseOfferingApi"
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
  GradeResponse,
  CalendarEventResponse,
  ReconcileModule,
  ResetModule,
  ReconcilePreview,
  ReconcileApplyResult,
  ResetResult,
  CourseDriftCheck,
  DriftScanStatus,
  EnrollmentDriftFilters,
  EnrollmentDriftItem,
  EnrollmentDriftList,
  EnrollmentDriftSummary,
} from "../types"
import {
  ApplyReconcileRequestSchema,
  ResetRequestSchema,
} from "../schemas/reconcile.schema"
import {
  EnrollmentDriftFiltersSchema,
  ResolveDriftReasonSchema,
} from "../schemas/enrollment-drift.schema"

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

interface UnitLookupEntry {
  name: string
  typeCode: string
  parentId: number | null
  linkedEntity: { type: string; id: number } | null
}

// Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
// Walks a category's AcademicUnit ancestor chain (parentId) looking for the
// nearest node whose linkedEntity resolves to a MajorProgram (A18) — e.g.
// the "PART-TIME PROGRAMS" root category. Real derivation, not a guess:
// every node in `unitsById` came from the same tree this category's own
// `academicUnitId` belongs to. A depth guard prevents an infinite loop if
// the tree ever has a cyclic parentId (shouldn't happen, but this is
// client-side derived data, not a trusted server invariant).
function resolveMajorProgramId(
  academicUnitId: number | null,
  unitsById: Map<number, UnitLookupEntry>
): number | null {
  let currentId = academicUnitId
  let guard = 0
  while (currentId !== null && guard < 50) {
    const unit = unitsById.get(currentId)
    if (!unit) return null
    if (unit.linkedEntity?.type === "major_program") {
      return unit.linkedEntity.id
    }
    currentId = unit.parentId
    guard += 1
  }
  return null
}

function mapCategorySync(
  raw: RawCategorySync,
  unitsById: Map<number, UnitLookupEntry>
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
    majorProgramId: resolveMajorProgramId(raw.academicUnitId, unitsById),
  }
}

async function buildUnitLookup(): Promise<Map<number, UnitLookupEntry>> {
  const res = await academicUnitsApi.list()
  return new Map(
    res.data.map((u) => [
      u.id,
      {
        name: u.name,
        typeCode: u.typeCode,
        parentId: u.parentId,
        linkedEntity: u.linkedEntity,
      },
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

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // `majorProgramId` is sent ahead of the backend per CLAUDE.md §14 (no
  // confirmation `/moodle-sync/categories` honors it yet) AND applied as a
  // real client-side filter — unlike most other speculative majorProgramId
  // sends in this codebase, this one is genuine: `mapCategorySync` above
  // already derives each row's true majorProgramId from the AcademicUnit
  // tree (A18's linkedEntity mechanism), so filtering on it here is
  // filtering on real data, not a guess.
  async listCategories(filters?: {
    majorProgramId?: number
  }): Promise<CategorySyncResponse[]> {
    const [res, unitsById] = await Promise.all([
      apiClient.get<{ data: RawCategorySync[] }>(`${BASE}/categories`, {
        ...AUTH,
        params: filters as Record<string, unknown>,
      }),
      buildUnitLookup(),
    ])
    const mapped = res.data.map((r) => mapCategorySync(r, unitsById))
    return filters?.majorProgramId
      ? mapped.filter((c) => c.majorProgramId === filters.majorProgramId)
      : mapped
  },

  async getCategoriesNeedingMapping(filters?: {
    majorProgramId?: number
  }): Promise<CategorySyncResponse[]> {
    const [res, unitsById] = await Promise.all([
      apiClient.get<{ data: RawCategorySync[] }>(
        `${BASE}/categories/needs-mapping`,
        { ...AUTH, params: filters as Record<string, unknown> }
      ),
      buildUnitLookup(),
    ])
    const mapped = res.data.map((r) => mapCategorySync(r, unitsById))
    return filters?.majorProgramId
      ? mapped.filter((c) => c.majorProgramId === filters.majorProgramId)
      : mapped
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

  // ---------- Cohorts (Multi-Program Platform) ----------
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

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // Sent ahead of the backend per CLAUDE.md §14. Send-only, unlike
  // listCategories above: CourseSyncResponse carries no field a
  // majorProgramId could be derived from client-side without an extra
  // cross-join against the category tree's moodleCategoryId (course's own
  // `moodleCategoryId` isn't the same id space as a category row's
  // `academicUnitId`) — not built here rather than faked, same reasoning as
  // A33's pure-aggregate sends elsewhere in this codebase.
  async listCourses(filters?: {
    majorProgramId?: number
  }): Promise<CourseSyncResponse[]> {
    const res = await apiClient.get<{ data: CourseSyncResponse[] }>(
      `${BASE}/courses`,
      { ...AUTH, params: filters as Record<string, unknown> }
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

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // `majorProgramId` sent ahead of the backend per CLAUDE.md §14 — send-only,
  // same reasoning as listCourses above (EnrollmentSyncResponse carries no
  // program-derivable field either).
  async listEnrollments(
    filters: { status?: string; majorProgramId?: number } = {}
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

  // ── Enrollment drift ──────────────────────────────────────────────────────
  // sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md §5. The portal is
  // the authority: nothing here ever creates a portal enrollment.

  // One course, synchronous. Updates only the drift report, never enrollments.
  async checkCourseEnrollments(
    moodleCourseId: number
  ): Promise<CourseDriftCheck> {
    const res = await apiClient.post<{ data: CourseDriftCheck }>(
      `${BASE}/enrollments/drift/check/${moodleCourseId}`,
      undefined,
      AUTH
    )
    return res.data
  },

  // Every synced course, queued. Poll getDriftScanStatus while RUNNING.
  async startDriftScan(): Promise<DriftScanStatus> {
    const res = await apiClient.post<{ data: DriftScanStatus }>(
      `${BASE}/enrollments/drift/scan`,
      undefined,
      AUTH
    )
    return res.data
  },

  async getDriftScanStatus(): Promise<DriftScanStatus> {
    const res = await apiClient.get<{ data: DriftScanStatus }>(
      `${BASE}/enrollments/drift/scan`,
      AUTH
    )
    return res.data
  },

  async listEnrollmentDrift(
    filters: EnrollmentDriftFilters = {}
  ): Promise<EnrollmentDriftList> {
    const params = EnrollmentDriftFiltersSchema.parse(filters)
    return apiClient.get<EnrollmentDriftList>(`${BASE}/enrollments/drift`, {
      ...AUTH,
      params: params as Record<string, unknown>,
    })
  },

  async getEnrollmentDriftSummary(): Promise<EnrollmentDriftSummary> {
    const res = await apiClient.get<{ data: EnrollmentDriftSummary }>(
      `${BASE}/enrollments/drift/summary`,
      AUTH
    )
    return res.data
  },

  // MISSING_IN_MOODLE only — re-pushes the portal enrollment.
  async reEnrollDrift(id: number): Promise<EnrollmentDriftItem> {
    const res = await apiClient.post<{ data: EnrollmentDriftItem }>(
      `${BASE}/enrollments/drift/${id}/re-enroll`,
      undefined,
      AUTH
    )
    return res.data
  },

  // ONLY_IN_MOODLE only — removes the student from the Moodle course. The
  // portal is not changed.
  async unenrolDrift(id: number, reason: string): Promise<EnrollmentDriftItem> {
    const body = ResolveDriftReasonSchema.parse({ reason })
    const res = await apiClient.post<{ data: EnrollmentDriftItem }>(
      `${BASE}/enrollments/drift/${id}/unenrol`,
      body,
      AUTH
    )
    return res.data
  },

  async dismissDrift(id: number, reason: string): Promise<EnrollmentDriftItem> {
    const body = ResolveDriftReasonSchema.parse({ reason })
    const res = await apiClient.post<{ data: EnrollmentDriftItem }>(
      `${BASE}/enrollments/drift/${id}/dismiss`,
      body,
      AUTH
    )
    return res.data
  },

  async reopenDrift(id: number): Promise<EnrollmentDriftItem> {
    const res = await apiClient.post<{ data: EnrollmentDriftItem }>(
      `${BASE}/enrollments/drift/${id}/reopen`,
      undefined,
      AUTH
    )
    return res.data
  },

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

  // `GET /assessments` has no `lecturerId` filter, and `GET /assessments/my`
  // is student-only (403s a tutor) — confirmed live 2026-09-23. Worse:
  // `?offeringId=` itself is documented but a confirmed no-op server-side —
  // `?offeringId=1` and `?offeringId=2` both returned the identical
  // unfiltered 17-row list live, so per-offering server calls can't be
  // trusted to filter anything (flagged for the backend separately, see
  // sandbox/BACKEND_DEVIATIONS_2026-09-14.md). Each assessment row also
  // carries no offering/course id at all — only `course.code`/`course.title`
  // strings — so an exact match isn't possible either way. This derives a
  // best-effort match instead: fetch the tutor's own assigned offerings
  // (the same `?lecturerId=` call Course Assignments already uses) and the
  // full assessment list once, then keep only assessments whose course code
  // matches one of the tutor's own course codes. Honest, not exact — same
  // "derived filter" caveat already established elsewhere in this app for
  // records with no id to match on directly.
  async getMyTutorAssessments(
    lecturerId: number,
    filters: Partial<
      Pick<AssessmentFilter, "type" | "isVisible" | "page" | "limit">
    > = {}
  ): Promise<PaginatedAssessments> {
    const [{ data: offerings }, allAssessments] = await Promise.all([
      offeringsApi.list({ lecturerId }),
      moodleSyncService.listAssessmentsPaginated({
        type: filters.type,
        isVisible: filters.isVisible,
        limit: 500,
      }),
    ])
    const myCourseCodes = new Set(
      offerings.map((o) => o.course_code.toLowerCase())
    )
    const mine = allAssessments.data.filter((a) =>
      myCourseCodes.has(a.courseCode.toLowerCase())
    )
    const page = filters.page ?? 1
    const limit = filters.limit ?? mine.length
    const start = (page - 1) * limit
    return {
      data: mine.slice(start, start + limit),
      meta: { total: mine.length, page, limit },
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

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // `majorProgramId` sent ahead of the backend per CLAUDE.md §14. Send-only:
  // this is a pure aggregate (summary counts + a flat per-course list with
  // no program-derivable field), so there's nothing to filter client-side —
  // same reasoning as A33's other pure-aggregate sends in this codebase.
  async getAssessmentSyncStatus(filters?: {
    majorProgramId?: number
  }): Promise<AssessmentSyncStatusResult> {
    // `/assessments/sync/status` — Admin. Documented shape is
    // `{ summary: {...}, courses: [...] }`; the older
    // `/moodle-sync/assessments/sync-status` returned a flatter
    // `{ data: { totalAssessments, totalSyncedCourses, coursesByStatus } }`.
    // Normalize both so the table never crashes on a shape change.
    const res = await apiClient.get<Record<string, unknown>>(
      `/assessments/sync/status`,
      { ...AUTH, params: filters as Record<string, unknown> }
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

  // ── Reconcile & Reset ────────────────────────────────────────────────────
  // sandbox/moodle-sync-reconciliation/API_CONTRACTS.md.

  // Dry run against live Moodle — writes nothing.
  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // `majorProgramId` sent ahead of the backend per CLAUDE.md §14 as a query
  // param (the endpoint takes no body) — send-only, narrowing which
  // module's records get previewed/reconciled to one major program isn't
  // something the frontend can verify happened without the backend's own
  // response naming the scope it applied.
  async previewReconcile(
    module: ReconcileModule,
    filters?: { majorProgramId?: number }
  ): Promise<ReconcilePreview> {
    const res = await apiClient.post<{ data: ReconcilePreview }>(
      `${BASE}/${module}/reconcile/preview`,
      undefined,
      { ...AUTH, params: filters as Record<string, unknown> }
    )
    return res.data
  },

  // Applies exactly the previewed diff. Removed-in-Moodle rows are flagged,
  // never deleted.
  async applyReconcile(
    module: ReconcileModule,
    previewId: string
  ): Promise<ReconcileApplyResult> {
    const body = ApplyReconcileRequestSchema.parse({ previewId })
    const res = await apiClient.post<{ data: ReconcileApplyResult }>(
      `${BASE}/${module}/reconcile/apply`,
      body,
      AUTH
    )
    return res.data
  },

  // Cache-only modules. `repull: true` deletes and re-pulls in one queued job
  // so the portal is never left empty in between.
  async resetModule(
    module: ResetModule,
    repull: boolean
  ): Promise<ResetResult> {
    const body = ResetRequestSchema.parse({ repull })
    const res = await apiClient.post<{ data: ResetResult }>(
      `${BASE}/${module}/reset`,
      body,
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
