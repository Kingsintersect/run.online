// ─── Director Feature Types ─────────────────────────────────────────────────
// Overview/Financial/Statistical tabs were fully mock (Math.random()) until
// this pass — see sandbox/MISSING_BACKEND_APIS.md §2.8 for the full audit and
// the endpoints designed to back them. `Faculty`/`AcademicLevel`/`PaymentStatus`
// closed unions have been replaced with real strings/numbers to match the
// admin-configurable Faculty table and real Level/Invoice models (same reason
// this was already done for GradeReport below).

export type UserRole = "student" | "tutor" | "director" | "admin"

export type Semester = "First" | "Second"

// Real Invoice.status values (payment_README.md) — CANCELLED/WAIVED are
// treated as "unpaid" for display purposes since the UI has no dedicated
// state for them.
export type PaymentStatus = "paid" | "partial" | "unpaid" | "overdue"

export type GradePoint = "A" | "B" | "C" | "D" | "E" | "F"

// ─── Dashboard Overview ──────────────────────────────────────────────────────

export interface DashboardMetric {
  label: string
  value: number | string
  // Every KPI here would need a historical snapshot to diff against to show a
  // real trend, and no such snapshot exists anywhere in the schema/bruno for
  // any of these numbers (students, tutors, revenue, programs, graduation
  // rate) — see MISSING_BACKEND_APIS.md §2.8. Omit rather than fabricate.
  change?: number
  changeLabel?: string
  icon: string
  trend?: "up" | "down" | "neutral"
}

export interface DashboardOverview {
  totalStudents: number
  totalTutors: number
  totalRevenue: number
  pendingPayments: number
  activePrograms: number
  totalFaculties: number
  // Point-in-time ratio (GRADUATED students ÷ total students), not a "vs last
  // year" trend — no historical snapshot exists to compute that against.
  graduationRate: number
  metrics: DashboardMetric[]
  // Added 2026-09-12: confirmed live that /users/stats, /enrollments/trend,
  // and the fees summary endpoints all 403 for DIRECTOR (and DEAN/BURSARY
  // hit an overlapping subset — see sandbox/fee-management/
  // bursary_403_bug_report.md, now covering DIRECTOR too). fetchOverview()
  // previously swallowed every one of those failures behind `?? 0`, so the
  // dashboard showed "0 students" / "₦0.0M revenue" as if that were real
  // data instead of a failed request — actively misleading for an
  // executive-oversight page. This flag lets the page show its existing
  // error banner honestly instead of silently faking zeros.
  hasLoadErrors: boolean
}

// ─── Enrollment Chart Data ───────────────────────────────────────────────────
// Proposed GET /enrollments/trend — see MISSING_BACKEND_APIS.md §2.8. No
// time-series aggregate exists anywhere in the Enrollment module today.

export interface EnrollmentDataPoint {
  month: string
  students: number
  newEnrollments: number
}

// Proposed extension of GET /users/stats's `byFaculty` — see §2.8.
export interface FacultyDistribution {
  faculty: string
  students: number
  tutors: number
  percentage: number
}

// ─── Financial Types ─────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string
  studentId: string
  studentName: string
  matricNumber: string
  faculty: string
  department: string
  program: string
  level: number
  feeType: string
  academicYear: string
  amount: number
  amountPaid: number
  balance: number
  status: PaymentStatus
  paymentDate?: string
  dueDate: string
}

export interface FinancialSummary {
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  // Real, from GET /fees/reports/outstanding — grouped by fee type, not
  // faculty (no endpoint anywhere joins Invoice → Student → Program →
  // Department → Faculty for a revenue breakdown). Renamed from the old
  // mock's `byFaculty` for honesty — see §2.8.
  byFeeType: {
    feeTypeId: number
    feeType: string
    invoiced: number
    paid: number
    outstanding: number
    studentCount: number
  }[]
  // Proposed GET /fees/reports/collections-trend — see §2.8. No time-series
  // aggregate exists anywhere in the Fee module today.
  monthlyTrend: {
    month: string
    collected: number
    expected: number
  }[]
  // Added 2026-09-12 — see DashboardOverview.hasLoadErrors's comment.
  hasLoadErrors: boolean
}

// ─── Student / Tutor Report Types ────────────────────────────────────────

export interface StudentRecord {
  id: string
  matricNumber: string
  fullName: string
  email: string
  phone: string
  faculty: string
  department: string
  program: string
  // Nullable — sandbox/program-structure-depth/. Null for a
  // FOUNDATIONAL/CERTIFICATE student, neither of which has a Level.
  level: number | null
  academicYear: string
  cgpa: number
  status: "active" | "deferred" | "graduated" | "withdrawn"
  gender: "Male" | "Female"
}

export interface TutorRecord {
  id: string
  staffId: string
  fullName: string
  email: string
  phone: string
  faculty: string
  department: string
  designation: string
  // Real Lecturer has no employment-status field beyond the linked User's
  // isActive flag — the mock's "on-leave"/"sabbatical" states don't exist in
  // the schema, so this is a plain active/inactive derived from that.
  status: "active" | "inactive"
}

export interface StatisticalReport {
  students: StudentRecord[]
  tutors: TutorRecord[]
  totalStudents: number
  totalTutors: number
  // GET /users/stats extension — see §2.8, now shipped. Arrays rather than
  // a fixed Record since the real Level table isn't limited to 100-500.
  studentsByLevel: { level: number; count: number }[]
  studentsByGender: { male: number; female: number }
  tutorsByDesignation: { designation: string; count: number }[]
  // Added 2026-09-12 — see DashboardOverview.hasLoadErrors's comment.
  hasLoadErrors: boolean
}

// ─── Grade Report Types ──────────────────────────────────────────────────────
// Sourced from GET /results/reports/director-grade-summary — see
// sandbox/result/missing_grade_apis.readme.md §8, now shipped by the backend
// team. `faculty`/`semester`/`grade` are plain strings, not the
// closed Faculty/Semester/GradePoint unions used elsewhere in this module —
// those unions were sized to the old mock's fixed lists (8 faculties, 6
// grades) and don't match the real, admin-configurable Faculty and
// GradeScale models (which currently has 8 grades: A, AB, B, BC, C, CD, D, F).

export interface CourseGrade {
  courseId: number
  courseCode: string
  courseTitle: string
  creditUnits: number
  score: number | null
  grade: string | null
  gradePoints: number | null
  tutorName: string | null
}

export interface StudentGradeRecord {
  studentId: number
  matricNumber: string
  studentName: string
  faculty: string
  department: string
  program: string
  level: number
  academicYear: string
  semester: string
  courses: CourseGrade[]
  semesterGPA: number
  cgpa: number
  totalUnits: number
  earnedUnits: number
  status: "pass" | "probation" | "fail" | "distinction"
}

export interface GradeDistribution {
  grade: string
  count: number
  percentage: number
}

// Real contract per bruno/director/Grade Reports - Summary.bru — a single
// `semesterId` filter, response `{data: {overall, byFaculty, byProgram}}`.
// Replaces the earlier proposed `{summary, gradeDistribution, records, meta}`
// shape (no per-student records or grade-distribution breakdown in the real
// endpoint — see sandbox/TRIPLE_AUDIT_2026-09-13.md §1a).
export interface GradeReportOverall {
  averageGPA: number
  passRate: number
  distinctionRate: number
  totalRecords: number
}

export interface GradeReportByFaculty {
  faculty: string
  averageGPA: number
  studentCount: number
}

export interface GradeReportByProgram {
  program: string
  averageGPA: number
  studentCount: number
}

export interface GradeReport {
  overall: GradeReportOverall
  byFaculty: GradeReportByFaculty[]
  byProgram: GradeReportByProgram[]
}

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface DirectorFilter {
  faculty?: string
  department?: string
  program?: string
  academicYear?: string
  semester?: Semester | "all"
  level?: string
  status?: string
  search?: string
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

// ─── Store Shape ─────────────────────────────────────────────────────────────

export interface DirectorStoreState {
  overview: DashboardOverview | null
  enrollmentData: EnrollmentDataPoint[]
  facultyDistribution: FacultyDistribution[]
  financialSummary: FinancialSummary | null
  paymentRecords: PaymentRecord[]
  statisticalReport: StatisticalReport | null
  filter: DirectorFilter
  pagination: PaginationState
  loading: Record<string, boolean>
  errors: Record<string, string | null>
}

export interface DirectorStoreActions {
  setFilter: (filter: Partial<DirectorFilter>) => void
  resetFilter: () => void
  setPagination: (p: Partial<PaginationState>) => void
  fetchOverview: () => Promise<void>
  fetchFinancialSummary: (filter?: DirectorFilter) => Promise<void>
  fetchPaymentRecords: (filter?: DirectorFilter) => Promise<void>
  fetchStatisticalReport: (filter?: DirectorFilter) => Promise<void>
  setLoading: (key: string, value: boolean) => void
  setError: (key: string, error: string | null) => void
}

export type DirectorStore = DirectorStoreState & DirectorStoreActions
