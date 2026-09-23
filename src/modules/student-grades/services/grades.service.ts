// ─── Grades Service ───────────────────────────────────────────────────────────
//
// Real backend contract per bruno/result/*.bru (the sole source of truth for
// this module — see CLAUDE.md §13). Response wrapping is NOT uniform across
// this module — each method's comment cites what's actually confirmed:
//   - GradeScale Create and Grade Create/Publish are confirmed `{data: ...}`
//     (bru post-response scripts read `res.body.data.id`; Publish's docs
//     block gives `{data: {semesterId, published}}` verbatim).
//   - Grade Approve/Reject/BulkCreate are confirmed FLAT (result_README.md's
//     own example response bodies have no `data` wrapper).
//   - List/Get/By-Student/By-Course endpoints have no example body in either
//     bruno or result_README.md; treated as `{data: ...}`-wrapped GETs to
//     match every other integrated module's convention this session
//     (moodle-sync, document, hostel) — flagged here as a best-effort
//     assumption, not a confirmed fact.
//   - Grade Update/Submit have no example body either; Update is treated as
//     wrapped (same resource as Create), Submit as flat (same kind of bare
//     status-transition as Approve/Reject).
//
// Six analytics methods (getDashboardData, getGradeDistribution,
// getProgramPerformance, getCgpaTrends, getTopPerformers, getGroupedGrades)
// have real .bru contracts in bruno/result — see
// sandbox/result/missing_grade_apis.readme.md and MISSING_BACKEND_APIS.md §2.7
// for status. None of those .bru files carry an example body, and this
// module's envelope is inconsistent, so each of the six now routes its
// response through `unwrap()` — it returns the same value whether the backend
// answers flat or `{data:...}`, with a safe zero/empty fallback if the body
// is null. This is `sandbox/API_INTEGRATION_AUDIT.md` A1 resolved without
// needing a live admin capture. hasOutstandingFees is still not shipped on
// any Grade response (§2.7) — see mapGrade below.
//
// getCoursesByProgram, and the ACADEMIC_YEARS/SEMESTERS/PROGRAMS/COURSES
// reference constants below, are OUT OF SCOPE for this pass — they belong to
// the Academic/Course-structure modules, which are still mock elsewhere in
// this app too (see courseManagementApi.ts, courseStructureApi.ts). Real,
// already-wired replacements exist for sessions/semesters specifically
// (`academicSessionApi.list()` / `semesterApi.listBySession()` in
// feeManagementApi.ts) — swapping the picker over to those is a follow-up,
// not done here to keep this pass bounded.

import apiClient from "@/lib/clients/apiClient"
import type {
  Grade,
  GradeScale,
  GradeScaleInput,
  GradeFilters,
  GradesGroupBy,
  GradesPaginationState,
  GroupedGradeData,
  GradeSummaryStats,
  GradeDistributionItem,
  ProgramPerformance,
  CgpaTrendPoint,
  TopPerformer,
  StudentTranscript,
  TermResultEntry,
  CgpaHistoryEntry,
  AcademicYear,
  GradeSemester,
  GradeProgram,
  CourseOption,
  PublishSelectionFilters,
  PublishSummary,
  CreateGradeDto,
  BulkGradeDto,
  BulkGradeResult,
  UpdateGradeDto,
  PublishResult,
  GradeStatusTransitionResult,
  CalculateCgpaResult,
} from "../types/grades.types"

const BASE = "/results"
const AUTH = { access_token: true } as const

// The result-module analytics endpoints have no example body in bruno, and
// this module's own header notes the envelope is inconsistent across the
// module (some `{data:...}`, some flat). Rather than guess per-endpoint,
// accept both: return `body.data` when the response is wrapped, otherwise the
// body itself. `fallback` is used when the body is null/undefined.
function unwrap<T>(body: T | { data: T } | null | undefined, fallback: T): T {
  if (body == null) return fallback
  if (
    typeof body === "object" &&
    "data" in body &&
    (body as { data: T }).data !== undefined
  ) {
    return (body as { data: T }).data
  }
  return body as T
}

// ─── Reference Data (mock — see file header) ───────────────────────────────────

function getCurrentAcademicYearLabel(date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`
}

function toAcademicYearId(label: string) {
  return `ay-${label.replace("/", "-")}`
}

const CURRENT_ACADEMIC_YEAR = getCurrentAcademicYearLabel()
const CURRENT_ACADEMIC_YEAR_ID = toAcademicYearId(CURRENT_ACADEMIC_YEAR)

export const ACADEMIC_YEARS: AcademicYear[] = [
  { id: "ay-2023-2024", label: "2023/2024" },
  { id: "ay-2024-2025", label: "2024/2025" },
  ...(CURRENT_ACADEMIC_YEAR !== "2024/2025"
    ? [{ id: CURRENT_ACADEMIC_YEAR_ID, label: CURRENT_ACADEMIC_YEAR }]
    : []),
]

export const SEMESTERS: GradeSemester[] = [
  {
    id: "sem-3",
    label: "First Semester",
    academicYearId: "ay-2023-2024",
    academicYear: "2023/2024",
  },
  {
    id: "sem-4",
    label: "Second Semester",
    academicYearId: "ay-2023-2024",
    academicYear: "2023/2024",
  },
  {
    id: "sem-5",
    label: "First Semester",
    academicYearId: "ay-2024-2025",
    academicYear: "2024/2025",
  },
  {
    id: "sem-6",
    label: "Second Semester",
    academicYearId: "ay-2024-2025",
    academicYear: "2024/2025",
  },
  ...(CURRENT_ACADEMIC_YEAR !== "2024/2025"
    ? [
        {
          id: "sem-7",
          label: "First Semester",
          academicYearId: CURRENT_ACADEMIC_YEAR_ID,
          academicYear: CURRENT_ACADEMIC_YEAR,
        },
        {
          id: "sem-8",
          label: "Second Semester",
          academicYearId: CURRENT_ACADEMIC_YEAR_ID,
          academicYear: CURRENT_ACADEMIC_YEAR,
        },
      ]
    : []),
]

export const PROGRAMS: GradeProgram[] = [
  {
    id: "csc",
    name: "Computer Science",
    code: "CSC",
    departmentName: "Department of Computer Science",
  },
  {
    id: "eee",
    name: "Electrical & Electronics Eng.",
    code: "EEE",
    departmentName: "Department of Electrical Engineering",
  },
  {
    id: "bus",
    name: "Business Administration",
    code: "BUS",
    departmentName: "Faculty of Management Sciences",
  },
  {
    id: "mee",
    name: "Mechanical Engineering",
    code: "MEE",
    departmentName: "Department of Mechanical Engineering",
  },
]

export const COURSES: CourseOption[] = [
  {
    id: 1,
    name: "Data Structures & Algorithms",
    code: "CSC301",
    creditUnits: 3,
    programId: "csc",
  },
  {
    id: 2,
    name: "Operating Systems",
    code: "CSC303",
    creditUnits: 3,
    programId: "csc",
  },
  {
    id: 3,
    name: "Computer Organisation",
    code: "CSC305",
    creditUnits: 2,
    programId: "csc",
  },
  {
    id: 4,
    name: "Database Management Systems",
    code: "CSC302",
    creditUnits: 3,
    programId: "csc",
  },
  {
    id: 5,
    name: "Software Engineering",
    code: "CSC304",
    creditUnits: 3,
    programId: "csc",
  },
  {
    id: 6,
    name: "Circuit Theory",
    code: "EEE301",
    creditUnits: 3,
    programId: "eee",
  },
  {
    id: 7,
    name: "Electrical Machines I",
    code: "EEE303",
    creditUnits: 3,
    programId: "eee",
  },
  {
    id: 8,
    name: "Electronic Devices",
    code: "EEE305",
    creditUnits: 2,
    programId: "eee",
  },
  {
    id: 9,
    name: "Power Systems",
    code: "EEE302",
    creditUnits: 3,
    programId: "eee",
  },
  {
    id: 10,
    name: "Control Systems",
    code: "EEE304",
    creditUnits: 3,
    programId: "eee",
  },
  {
    id: 11,
    name: "Business Law",
    code: "BUS301",
    creditUnits: 3,
    programId: "bus",
  },
  {
    id: 12,
    name: "Marketing Management",
    code: "BUS303",
    creditUnits: 3,
    programId: "bus",
  },
  {
    id: 13,
    name: "Cost Accounting",
    code: "ACC301",
    creditUnits: 3,
    programId: "bus",
  },
  {
    id: 14,
    name: "Financial Management",
    code: "BUS302",
    creditUnits: 3,
    programId: "bus",
  },
  {
    id: 15,
    name: "Human Resource Management",
    code: "BUS304",
    creditUnits: 3,
    programId: "bus",
  },
  {
    id: 16,
    name: "Mechanics of Materials",
    code: "MEE301",
    creditUnits: 3,
    programId: "mee",
  },
  {
    id: 17,
    name: "Engineering Thermodynamics",
    code: "MEE303",
    creditUnits: 3,
    programId: "mee",
  },
  {
    id: 18,
    name: "Fluid Mechanics",
    code: "MEE305",
    creditUnits: 3,
    programId: "mee",
  },
  {
    id: 19,
    name: "Machine Design I",
    code: "MEE302",
    creditUnits: 3,
    programId: "mee",
  },
  {
    id: 20,
    name: "Heat Transfer",
    code: "MEE304",
    creditUnits: 3,
    programId: "mee",
  },
]

// ─── Real-response → flat-UI-shape mapping ─────────────────────────────────────
//
// Every component in this module reads a flat Grade (grade.studentName,
// grade.courseCode, grade.semesterName, ...) rather than nested relations.
// bruno/result never shows a full Grade List/Get response body, but
// result_ui_README.md's GradeWithDetails shape and the CGPA endpoint's
// confirmed `semester.academicSession.name` nesting both point to a
// relation-nested response. Rather than rewrite ~10 consuming components to
// read nested paths on an unconfirmed shape, this mapper is the single place
// that translates whatever the real API returns into the shape already in
// use — if the real nesting differs once verified against a live response,
// only this function needs to change.
interface RawGradeRelations {
  id: number
  studentId: number
  courseId: number
  semesterId: number
  caScore: number | null
  examScore: number | null
  totalScore: number | null
  gradeScaleId: number | null
  gradePoint: number | null
  status: Grade["status"]
  approvedBy?: number
  approvedAt?: string
  submittedAt?: string
  remarks?: string
  hasOutstandingFees?: boolean
  createdAt: string
  updatedAt?: string
  student?: {
    matricNumber?: string
    user?: {
      firstName?: string | null
      lastName?: string | null
      email?: string
    }
  }
  course?: { code?: string; title?: string; creditUnits?: number }
  semester?: { name?: string; academicSession?: { name?: string } }
  gradeScale?: { grade?: string; gradePoint?: number; description?: string }
}

function mapGrade(raw: RawGradeRelations): Grade {
  const firstName = raw.student?.user?.firstName ?? ""
  const lastName = raw.student?.user?.lastName ?? ""
  return {
    id: raw.id,
    studentId: raw.studentId,
    studentName: `${firstName} ${lastName}`.trim() || "—",
    studentMatric: raw.student?.matricNumber ?? "—",
    studentEmail: raw.student?.user?.email ?? "",
    programId: "",
    programName: "",
    programCode: "",
    courseId: raw.courseId,
    courseName: raw.course?.title ?? "—",
    courseCode: raw.course?.code ?? "—",
    creditUnits: raw.course?.creditUnits ?? 0,
    semesterId: String(raw.semesterId),
    semesterName: raw.semester?.name ?? "—",
    academicYearId: "",
    academicYear: raw.semester?.academicSession?.name ?? "—",
    caScore: raw.caScore,
    examScore: raw.examScore,
    totalScore: raw.totalScore,
    gradeScaleId: raw.gradeScaleId,
    gradeLetter: raw.gradeScale?.grade ?? null,
    gradePoint: raw.gradePoint,
    status: raw.status,
    submittedAt: raw.submittedAt,
    approvedBy: raw.approvedBy,
    approvedByName: undefined,
    approvedAt: raw.approvedAt,
    remarks: raw.remarks,
    // Defaults to fee-cleared until the backend adds this field — see
    // sandbox/result/missing_grade_apis.readme.md §7a.
    hasOutstandingFees: raw.hasOutstandingFees ?? false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class GradesService {
  // ── Grade Scales — real ─────────────────────────────────────────────────────

  async getGradeScales(): Promise<GradeScale[]> {
    const res = await apiClient.get<{ data: GradeScale[] }>(
      `${BASE}/grade-scales`,
      AUTH
    )
    return res.data
  }

  // POST/PATCH/DELETE /results/grade-scales — Admin only. `grade` unique,
  // max 2 chars; minScore/maxScore 0-100 with maxScore >= minScore;
  // gradePoint >= 0; description nullable, max 50. DELETE is RESTRICT-blocked
  // once any Grade references the band.
  async createGradeScale(dto: GradeScaleInput): Promise<GradeScale> {
    const res = await apiClient.post<{ data: GradeScale }>(
      `${BASE}/grade-scales`,
      dto,
      AUTH
    )
    return res.data
  }

  async updateGradeScale(
    id: number,
    dto: Partial<GradeScaleInput>
  ): Promise<GradeScale> {
    const res = await apiClient.patch<{ data: GradeScale }>(
      `${BASE}/grade-scales/${id}`,
      dto,
      AUTH
    )
    return res.data
  }

  async deleteGradeScale(id: number): Promise<void> {
    await apiClient.delete<void>(`${BASE}/grade-scales/${id}`, AUTH)
  }

  // GET /results/grades/course/:courseId/semester/:semesterId — Lecturer,
  // Admin. Every grade for one course in one semester, in one call (no
  // pagination) — for the tutor grade book's per-course view.
  async getGradesByCourseAndSemester(
    courseId: number,
    semesterId: number
  ): Promise<Grade[]> {
    const res = await apiClient.get<{ data: RawGradeRelations[] }>(
      `${BASE}/grades/course/${courseId}/semester/${semesterId}`,
      AUTH
    )
    return res.data.map(mapGrade)
  }

  // GET /results/grades/:id — one grade with its relations expanded. The list
  // rows already carry most of this; used to refresh a single row (e.g. the
  // detail modal) against the freshest server state. Envelope unconfirmed —
  // routed through `unwrap` like the analytics endpoints.
  async getGradeById(id: number): Promise<Grade> {
    const res = await apiClient.get<
      RawGradeRelations | { data: RawGradeRelations }
    >(`${BASE}/grades/${id}`, AUTH)
    return mapGrade(unwrap<RawGradeRelations>(res, {} as RawGradeRelations))
  }

  // ── Grades (filtered + paginated) — real ────────────────────────────────────

  async getGrades(
    filters: GradeFilters,
    page: number,
    pageSize: number
  ): Promise<{ data: Grade[]; pagination: GradesPaginationState }> {
    const params: Record<string, unknown> = { page, limit: pageSize }
    if (filters.status !== "all") params.status = filters.status
    if (filters.semesterId !== "all")
      params.semesterId =
        Number(filters.semesterId.replace(/\D/g, "")) || undefined
    // Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md
    // A35. Sent ahead of the backend per CLAUDE.md §14. No client-side
    // fallback filter is possible here: mapGrade (below) always sets
    // programId/programName to "" because the raw /results/grades response's
    // `course` relation carries no program info at all — there's genuinely
    // nothing per-row to match against a major program with, unlike
    // fee-management's invoices (which do carry a resolvable program via the
    // student relation).
    if (filters.majorProgramId != null)
      params.majorProgramId = filters.majorProgramId
    // studentId/courseId aren't part of GradeFilters (search box covers that
    // client-side below); academicYearId/programId/gradeLetter have no real
    // query-param counterpart on GET /results/grades and are applied
    // client-side over the returned page for now.
    const res = await apiClient.get<{
      data: RawGradeRelations[]
      meta?: { total: number; page: number; limit: number }
    }>(`${BASE}/grades`, { ...AUTH, params })

    let data = res.data.map(mapGrade)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      data = data.filter(
        (g) =>
          g.studentName.toLowerCase().includes(q) ||
          g.studentMatric.toLowerCase().includes(q) ||
          g.courseCode.toLowerCase().includes(q)
      )
    }
    if (filters.gradeLetter !== "all")
      data = data.filter((g) => g.gradeLetter === filters.gradeLetter)

    const meta = res.meta ?? { total: data.length, page, limit: pageSize }
    return {
      data,
      pagination: {
        page: meta.page,
        pageSize: meta.limit,
        total: meta.total,
        totalPages: Math.max(1, Math.ceil(meta.total / meta.limit)),
      },
    }
  }

  // ── Student CGPA — real (`GET /results/cgpa/student/:id`) ──────────────────
  // The standing CGPA figure plus per-semester history, from ONE call. Split
  // out of getStudentTranscript so surfaces that only need the number (e.g.
  // the student dashboard's CGPA stat) don't also pull the full grade list.
  async getStudentCgpa(studentId: number): Promise<{
    currentCGPA: number | null
    history: CgpaHistoryEntry[]
  }> {
    const res = await apiClient.get<{
      data: {
        id: number
        semesterId: number
        semester: { name: string; academicSession: { name: string } }
        gpa: number
        cgpa: number
        totalCreditUnits: number
      }[]
      // Confirmed live: null for a student with no CGPA-bearing semester
      // yet, not just a theoretical case — every consumer must render it
      // defensively.
      currentCGPA: number | null
    }>(`${BASE}/cgpa/student/${studentId}`, AUTH)

    return {
      currentCGPA: res.currentCGPA ?? null,
      history: res.data.map((h) => ({
        id: h.id,
        studentId,
        semesterId: String(h.semesterId),
        semesterName: h.semester?.name ?? "—",
        academicYear: h.semester?.academicSession?.name ?? "—",
        gpa: h.gpa,
        cgpa: h.cgpa,
        totalCreditUnits: h.totalCreditUnits,
      })),
    }
  }

  // ── Student Transcript — real (composed from two real endpoints) ───────────

  async getStudentTranscript(studentId: number): Promise<StudentTranscript> {
    const [gradesRes, cgpa] = await Promise.all([
      apiClient.get<{ data: RawGradeRelations[] }>(
        `${BASE}/grades/student/${studentId}`,
        AUTH
      ),
      this.getStudentCgpa(studentId),
    ])

    const grades = gradesRes.data.map(mapGrade)
    const cgpaHistory = cgpa.history

    const first = grades[0]
    return {
      studentId,
      studentName: first?.studentName ?? "—",
      studentMatric: first?.studentMatric ?? "—",
      studentEmail: first?.studentEmail ?? "",
      programName: first?.programName ?? "—",
      programCode: first?.programCode ?? "—",
      level: "",
      currentCGPA: cgpa.currentCGPA,
      totalCreditUnits: cgpaHistory.reduce((a, h) => a + h.totalCreditUnits, 0),
      grades,
      cgpaHistory,
    }
  }

  // ── Grade Actions — real ────────────────────────────────────────────────────

  async createGrade(dto: CreateGradeDto): Promise<Grade> {
    const res = await apiClient.post<{ data: RawGradeRelations }>(
      `${BASE}/grades`,
      dto,
      AUTH
    )
    return mapGrade(res.data)
  }

  async updateGrade(id: number, dto: UpdateGradeDto): Promise<Grade> {
    const res = await apiClient.patch<{ data: RawGradeRelations }>(
      `${BASE}/grades/${id}`,
      dto,
      AUTH
    )
    return mapGrade(res.data)
  }

  async bulkCreateGrades(dto: BulkGradeDto): Promise<BulkGradeResult> {
    return apiClient.post<BulkGradeResult>(`${BASE}/grades/bulk`, dto, AUTH)
  }

  async submitGrade(id: number): Promise<GradeStatusTransitionResult> {
    return apiClient.patch<GradeStatusTransitionResult>(
      `${BASE}/grades/${id}/submit`,
      undefined,
      AUTH
    )
  }

  async approveGrade(
    id: number,
    remarks?: string
  ): Promise<GradeStatusTransitionResult> {
    return apiClient.patch<GradeStatusTransitionResult>(
      `${BASE}/grades/${id}/approve`,
      { remarks },
      AUTH
    )
  }

  async rejectGrade(
    id: number,
    remarks: string
  ): Promise<GradeStatusTransitionResult> {
    const res = await apiClient.patch<GradeStatusTransitionResult>(
      `${BASE}/grades/${id}/reject`,
      { remarks },
      AUTH
    )
    // Reject moves SUBMITTED -> DRAFT per result_README.md; the response's
    // own `status` field is the authoritative value, this is just a safety
    // fallback in case the backend ever echoes something unexpected.
    return { ...res, status: res.status ?? "DRAFT" }
  }

  // ── Publish — real, semester-scoped (NOT per-grade-id) ──────────────────────
  // The real endpoint publishes every APPROVED grade in a semester in one
  // shot; there is no "publish these specific grade IDs" endpoint. Callers
  // should re-fetch the affected grade set afterward rather than expect a
  // list of updated records back.

  async publishSemester(semesterId: number): Promise<PublishResult> {
    const res = await apiClient.post<{ data: PublishResult }>(
      `${BASE}/grades/publish/${semesterId}`,
      undefined,
      AUTH
    )
    return res.data
  }

  // ── Publish preview: real grades list, filtered client-side to a course ────
  // No dedicated "publish preview" endpoint exists — this is just the real
  // grades list, filtered by whatever the wizard has selected.

  async getGradesForPublish(
    filters: PublishSelectionFilters
  ): Promise<Grade[]> {
    const params: Record<string, unknown> = {}
    if (filters.semesterId)
      params.semesterId =
        Number(filters.semesterId.replace(/\D/g, "")) || undefined
    if (filters.courseId) params.courseId = filters.courseId
    const res = await apiClient.get<{ data: RawGradeRelations[] }>(
      `${BASE}/grades`,
      {
        ...AUTH,
        params,
      }
    )
    return res.data.map(mapGrade)
  }

  buildPublishSummary(grades: Grade[]): PublishSummary {
    const publishable = grades.filter((g) => g.status === "APPROVED")
    const alreadyPublished = grades.filter(
      (g) => g.status === "PUBLISHED"
    ).length
    const scored = grades.filter((g) => g.totalScore !== null)
    const avgScore = scored.length
      ? Math.round(
          (scored.reduce((a, g) => a + (g.totalScore ?? 0), 0) /
            scored.length) *
            10
        ) / 10
      : null
    const passing = grades.filter((g) => (g.gradePoint ?? 0) > 0).length
    const withheld = grades.filter(
      (g) => g.hasOutstandingFees && g.status !== "PUBLISHED"
    ).length
    return {
      totalGrades: grades.length,
      publishableCount: publishable.length,
      alreadyPublished,
      draftCount: grades.filter((g) => g.status === "DRAFT").length,
      submittedCount: grades.filter((g) => g.status === "SUBMITTED").length,
      withheldCount: withheld,
      avgScore,
      passRate: grades.length
        ? Math.round((passing / grades.length) * 1000) / 10
        : 0,
    }
  }

  // ── Analytics — real, see MISSING_BACKEND_APIS.md §2.7 for current status ──

  // Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md
  // A35. majorProgramId sent ahead of the backend per CLAUDE.md §14. This is
  // a pure institution-wide aggregate (totals only, no per-program
  // breakdown) — there is genuinely nothing per-record to filter client-side,
  // same reasoning as A33's "don't fake a filter on a pure aggregate with no
  // per-record breakdown." Sent only, no working fallback.
  async getDashboardData(
    majorProgramId?: number | null
  ): Promise<GradeSummaryStats> {
    const res = await apiClient.get<
      GradeSummaryStats | { data: GradeSummaryStats }
    >(`${BASE}/dashboard`, {
      ...AUTH,
      params: majorProgramId != null ? { majorProgramId } : undefined,
    })
    return unwrap<GradeSummaryStats>(res, {
      totalGrades: 0,
      publishedCount: 0,
      approvedCount: 0,
      pendingApprovals: 0,
      draftCount: 0,
      averageCGPA: 0,
      highestCGPA: 0,
      passRate: 0,
    })
  }

  // Response shape unconfirmed (no example body in bruno) — treated as
  // `{data: ...}`-wrapped since it stores/returns a CgpaHistory row, matching
  // every other resource-returning POST in this module.
  async calculateCgpa(
    studentId: number,
    semesterId: number
  ): Promise<CalculateCgpaResult> {
    const res = await apiClient.post<{ data: CalculateCgpaResult }>(
      `${BASE}/cgpa/calculate/${studentId}/${semesterId}`,
      undefined,
      AUTH
    )
    return res.data
  }

  // Grade letter distribution, institution-wide — no program dimension at
  // all in the response (grouped by grade letter, not program). Same "pure
  // aggregate, sent only" reasoning as getDashboardData above.
  async getGradeDistribution(
    majorProgramId?: number | null
  ): Promise<GradeDistributionItem[]> {
    const res = await apiClient.get<
      GradeDistributionItem[] | { data: GradeDistributionItem[] }
    >(`${BASE}/grades/distribution`, {
      ...AUTH,
      params: majorProgramId != null ? { majorProgramId } : undefined,
    })
    return unwrap<GradeDistributionItem[]>(res, [])
  }

  // Unlike the other four analytics endpoints here, this one's response IS
  // per-program (sandbox/result/missing_grade_apis.readme.md §3 documents a
  // real numeric `programId` per row) — a genuine client-side fallback filter
  // is possible and built in GradesSummaryPage (matches each row's programId
  // against programs known to belong to the selected major program, same
  // pattern as director/grades/page.tsx's byProgram name-matching).
  async getProgramPerformance(
    majorProgramId?: number | null
  ): Promise<ProgramPerformance[]> {
    const res = await apiClient.get<
      ProgramPerformance[] | { data: ProgramPerformance[] }
    >(`${BASE}/programs/performance`, {
      ...AUTH,
      params: majorProgramId != null ? { majorProgramId } : undefined,
    })
    return unwrap<ProgramPerformance[]>(res, [])
  }

  // Aggregated by semester, not by program — same "pure aggregate, sent
  // only" reasoning as getDashboardData above.
  async getCgpaTrends(
    majorProgramId?: number | null
  ): Promise<CgpaTrendPoint[]> {
    const res = await apiClient.get<
      CgpaTrendPoint[] | { data: CgpaTrendPoint[] }
    >(`${BASE}/cgpa/trends`, {
      ...AUTH,
      params: majorProgramId != null ? { majorProgramId } : undefined,
    })
    return unwrap<CgpaTrendPoint[]>(res, [])
  }

  // Each row carries `programName` (no id) — a genuine but weaker fallback
  // filter than getProgramPerformance's (name match, same approach as
  // director/grades/page.tsx's byProgram), built in GradesSummaryPage.
  async getTopPerformers(
    limit = 10,
    majorProgramId?: number | null
  ): Promise<TopPerformer[]> {
    const res = await apiClient.get<TopPerformer[] | { data: TopPerformer[] }>(
      `${BASE}/students/top-performers`,
      {
        ...AUTH,
        params: majorProgramId != null ? { limit, majorProgramId } : { limit },
      }
    )
    return unwrap<TopPerformer[]>(res, [])
  }

  async getGroupedGrades(
    groupBy: GradesGroupBy,
    filters: GradeFilters
  ): Promise<GroupedGradeData[]> {
    const params: Record<string, unknown> = { groupBy }
    if (filters.status !== "all") params.status = filters.status
    // Major-Program Scoping — sandbox/major-program-scoping/API_CONTRACTS.md
    // A35. Sent ahead of the backend per CLAUDE.md §14. Same "no per-record
    // program id" caveat as getGrades above applies to every grouping
    // dimension except `groupBy: "program"` (whose `key` is documented as the
    // real programId per sandbox/result/missing_grade_apis.readme.md §5) —
    // narrowing that one case client-side isn't done here to keep this
    // filter's behavior consistent across all three groupings rather than
    // working for one and silently not for the other two.
    if (filters.majorProgramId != null)
      params.majorProgramId = filters.majorProgramId
    const res = await apiClient.get<
      GroupedGradeData[] | { data: GroupedGradeData[] }
    >(`${BASE}/grades/grouped`, {
      ...AUTH,
      params,
    })
    return unwrap<GroupedGradeData[]>(res, [])
  }

  // ── Term Result Summary (SECONDARY_SCHOOL / SIMPLE_AVERAGE) ─────────────────
  // Confirmed live — see sandbox/schema-moodel-sync-refactor/api-v2.md
  // §"GET /students/me/results"; tracked as MISSING_BACKEND_APIS.md §2.16,
  // now shipped by the backend team. Only called for a student whose
  // Program.programCategory is SECONDARY_SCHOOL — every CREDIT_WEIGHTED_GPA
  // program (the default) keeps using the real getStudentTranscript above,
  // unchanged.

  // Real API: GET /students/me/results/:semesterId/download — Student.
  // Streams a PDF (semester transcript for credit-weighted programs, or a
  // term result sheet otherwise). 404 if no PUBLISHED result exists for that
  // semester — the caller surfaces that as "not available yet" rather than a
  // hard error. Endpoint spec: bruno/student/Download Result.bru.
  // The button degrades gracefully when no result is available.
  async downloadSemesterResult(semesterId: number): Promise<Blob> {
    return apiClient.get<Blob>(`/students/me/results/${semesterId}/download`, {
      ...AUTH,
      responseType: "blob",
    })
  }

  async getMyTermResults(): Promise<TermResultEntry[]> {
    const res = await apiClient.get<{
      programCategory: string
      schemeType: string
      data: { terms: TermResultEntry[] }
    }>("/students/me/results", AUTH)
    return res.data.terms
  }

  // ── Out of scope — different module, still mock (see file header) ──────────

  async getCoursesByProgram(programId: string): Promise<CourseOption[]> {
    await new Promise((r) => setTimeout(r, 150))
    return COURSES.filter((c) => c.programId === programId)
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportToCSV(grades: Grade[]): string {
    const header = [
      "ID",
      "Student",
      "Matric",
      "Program",
      "Course",
      "Semester",
      "CA Score",
      "Exam Score",
      "Total",
      "Grade",
      "Grade Point",
      "Status",
    ].join(",")
    const rows = grades.map((g) =>
      [
        g.id,
        `"${g.studentName}"`,
        g.studentMatric,
        `"${g.programName}"`,
        `"${g.courseName}"`,
        `"${g.semesterName} ${g.academicYear}"`,
        g.caScore ?? "",
        g.examScore ?? "",
        g.totalScore ?? "",
        g.gradeLetter ?? "",
        g.gradePoint ?? "",
        g.status,
      ].join(",")
    )
    return [header, ...rows].join("\n")
  }

  exportToPDF(grades: Grade[]): void {
    const win = window.open("", "_blank")
    if (!win) return
    const rows = grades
      .map(
        (g) =>
          `<tr><td>${g.studentName}</td><td>${g.studentMatric}</td><td>${g.courseName}</td><td>${g.totalScore ?? "-"}</td><td>${g.gradeLetter ?? "-"}</td><td>${g.gradePoint ?? "-"}</td><td>${g.status}</td></tr>`
      )
      .join("")
    win.document.write(
      `<!DOCTYPE html><html><head><title>Grades Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f0f0f0}h1{margin-bottom:16px}</style></head><body><h1>Grades Report — RUN Online Portal</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Student</th><th>Matric</th><th>Course</th><th>Total</th><th>Grade</th><th>Points</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    )
    win.document.close()
    win.print()
  }
}

export const gradesService = new GradesService()
