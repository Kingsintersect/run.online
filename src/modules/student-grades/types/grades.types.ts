// ─── Grade Domain Types ────────────────────────────────────────────────────

export type GradeStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED"
export type ExportFormat = "pdf" | "csv" | "excel"
export type GradesGroupBy = "academic_year" | "semester" | "program"

// ─── Grade Scale ──────────────────────────────────────────────────────────────

export interface GradeScale {
  id: number
  grade: string // "A", "AB", "B", etc.
  minScore: number
  maxScore: number
  gradePoint: number
  description: string
  color: string // Tailwind colour class for UI display
  // Multi-structure refactor addition — undefined/null on every existing
  // row (the institution's implicit default GPA scheme). See
  // sandbox/schema-moodel-sync-refactor/SCHEMA_CHANGES.md §3.
  gradingSchemeId?: number | null
}

// POST/PATCH body for `/results/grade-scales`.
export interface GradeScaleInput {
  grade: string
  minScore: number
  maxScore: number
  gradePoint: number
  description?: string
}

// ─── Grading Schemes ──────────────────────────────────────────────────────────
// Confirmed live (MISSING_BACKEND_APIS.md §2.16, now shipped) — see
// sandbox/schema-moodel-sync-refactor/api-v2.md
// §"Grading Schemes — /grading-schemes". Lets a Program opt into a scheme
// other than the institution's default credit-weighted GPA — e.g. WAEC's
// 9-point simple average for a SECONDARY_SCHOOL program, or pass/fail for a
// short CERTIFICATE course. `Program.gradingSchemeId === null` means "use
// the default," exactly as it does today.

export type GradingSchemeType =
  | "CREDIT_WEIGHTED_GPA"
  | "SIMPLE_AVERAGE"
  | "PASS_FAIL"

export interface GradingScheme {
  id: number
  name: string
  schemeType: GradingSchemeType
  passMark: number | null
  caWeightPercent: number | null
  examWeightPercent: number | null
  isActive: boolean
  gradeScales?: GradeScale[]
}

export interface CreateGradingSchemePayload {
  name: string
  schemeType: GradingSchemeType
  passMark?: number | null
  caWeightPercent?: number | null
  examWeightPercent?: number | null
}

export interface CreateSchemeScalePayload {
  grade: string
  minScore: number
  maxScore: number
  gradePoint?: number | null
  description?: string
}

// ─── Academic Periods ─────────────────────────────────────────────────────────

export interface AcademicYear {
  id: string
  label: string
}

export interface GradeSemester {
  id: string
  label: string
  academicYearId: string
  academicYear: string
}

export interface GradeProgram {
  id: string
  name: string
  code: string
  departmentName: string
}

// ─── Grade ────────────────────────────────────────────────────────────────────

export interface Grade {
  id: number
  studentId: number
  studentName: string
  studentMatric: string
  studentEmail: string
  programId: string
  programName: string
  programCode: string
  courseId: number
  courseName: string
  courseCode: string
  creditUnits: number
  semesterId: string
  semesterName: string
  academicYearId: string
  academicYear: string
  caScore: number | null
  examScore: number | null
  totalScore: number | null
  gradeScaleId: number | null
  gradeLetter: string | null
  gradePoint: number | null
  status: GradeStatus
  submittedAt?: string
  approvedBy?: number
  approvedByName?: string
  approvedAt?: string
  remarks?: string
  // Not yet returned by the real API — see sandbox/result/missing_grade_apis.readme.md
  // §7a. Mapped straight through from the raw response when present; reads as
  // fee-cleared (false) until the backend adds it, which is an honest "not
  // wired yet" default rather than a fabricated value.
  hasOutstandingFees: boolean
  createdAt: string
  updatedAt: string
}

// ─── CGPA History ─────────────────────────────────────────────────────────────

export interface CgpaHistoryEntry {
  id: number
  studentId: number
  semesterId: string
  semesterName: string
  academicYear: string
  gpa: number
  cgpa: number
  totalCreditUnits: number
}

// ─── Student Transcript ───────────────────────────────────────────────────────

export interface StudentTranscript {
  studentId: number
  studentName: string
  studentMatric: string
  studentEmail: string
  programName: string
  programCode: string
  level: string
  // Null for a student with no CGPA-bearing semester yet (e.g. no published
  // grades) — confirmed live, not just a defensive assumption; render
  // null-safely, don't assume a number.
  currentCGPA: number | null
  totalCreditUnits: number
  grades: Grade[]
  cgpaHistory: CgpaHistoryEntry[]
}

// ─── Term Result Summary (non-credit-weighted, e.g. WAEC) ───────────────────
// Confirmed live (MISSING_BACKEND_APIS.md §2.16, now shipped) — see
// sandbox/schema-moodel-sync-refactor/api-v2.md
// §"GET /students/me/results" (SECONDARY_SCHOOL / SIMPLE_AVERAGE branch).
// Used instead of StudentTranscript/CgpaHistory for a Program whose
// `programCategory` is SECONDARY_SCHOOL — a simple average + class
// position, not a credit-weighted GPA.

export interface TermResultSubject {
  courseCode: string
  courseTitle: string
  totalScore: number
  grade: string
}

export interface TermResultEntry {
  semesterId: number
  semesterName: string
  averageScore: number
  positionInClass: number | null
  totalStudentsInClass: number | null
  subjects: TermResultSubject[]
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface GradeSummaryStats {
  totalGrades: number
  publishedCount: number
  approvedCount: number
  pendingApprovals: number
  draftCount: number
  averageCGPA: number
  highestCGPA: number
  passRate: number
}

export interface GradeDistributionItem {
  grade: string
  gradePoint: number
  count: number
  percentage: number
  color: string
}

export interface ProgramPerformance {
  programId: string
  programName: string
  programCode: string
  studentCount: number
  avgGPA: number
  passRate: number
}

export interface CgpaTrendPoint {
  semesterLabel: string
  avgGPA: number
  avgCGPA: number
}

export interface TopPerformer {
  rank: number
  studentId: number
  studentName: string
  studentMatric: string
  programName: string
  programCode: string
  cgpa: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface GradeFilters {
  search: string
  status: GradeStatus | "all"
  academicYearId: string | "all"
  semesterId: string | "all"
  programId: string | "all"
  gradeLetter: string | "all"
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface GradesPaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// ─── Grouped Data ─────────────────────────────────────────────────────────────

export interface GroupedGradeData {
  key: string
  label: string
  subLabel?: string
  gradeCount: number
  studentCount: number
  avgGPA: number
  passRate: number
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  pagination: GradesPaginationState
}

// ─── Publish Results ──────────────────────────────────────────────────────────

export interface CourseOption {
  id: number
  name: string
  code: string
  creditUnits: number
  programId: string
}

export interface PublishSelectionFilters {
  academicYearId: string | null
  semesterId: string | null
  programId: string | null
  courseId: number | null
}

export interface PublishSummary {
  totalGrades: number
  publishableCount: number // APPROVED grades
  alreadyPublished: number
  draftCount: number
  submittedCount: number
  withheldCount: number // students with outstanding fees (not yet published)
  avgScore: number | null
  passRate: number
}

// ─── Real API DTOs (bruno/result) ──────────────────────────────────────────────

export interface CreateGradeDto {
  studentId: number
  courseId: number
  semesterId: number
  caScore?: number
  examScore?: number
}

export interface BulkGradeItemDto {
  studentId: number
  caScore?: number
  examScore?: number
}

export interface BulkGradeDto {
  courseId: number
  semesterId: number
  grades: BulkGradeItemDto[]
}

export interface BulkGradeResult {
  submitted: number
  errors: { studentId: number; message: string }[]
}

export interface UpdateGradeDto {
  caScore?: number
  examScore?: number
}

export interface PublishResult {
  semesterId: number
  published: number
  // Not yet returned by the real API — see missing_grade_apis.readme.md §7b.
  withheld?: number
}

export interface GradeStatusTransitionResult {
  id: number
  status: GradeStatus
  approvedBy?: number
  approvedAt?: string
  remarks?: string
}

export interface CalculateCgpaResult {
  studentId: number
  semesterId: number
  gpa: number
  cgpa: number
  totalCreditUnits: number
}
