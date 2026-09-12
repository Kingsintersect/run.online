/**
 * Director Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Real backend contract per bruno/{user,academic,fee,enrollment}/*.bru and
 * sandbox/MISSING_BACKEND_APIS.md §2.8 (the sole source of truth — see
 * CLAUDE.md §13). No `bruno/director/` collection exists, so this module
 * composes real endpoints from the User, Academic, and Fee modules wherever
 * possible instead of inventing bespoke Director endpoints — per §2.8's own
 * recommendation. The handful of genuine aggregates that had no real backing
 * anywhere (enrollment trend, revenue trend, faculty/level/gender/designation
 * breakdowns) were called against a designed, documented contract — now
 * shipped by the backend team, per the per-function comments below and §2.8
 * for the full spec of each.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from "@/lib/clients/apiClient"
import { usersApi } from "@/services/usersApi"
import { facultiesApi, programsApi } from "@/services/courseStructureApi"
import type {
  Student,
  Tutor,
  StudentQueryFilters,
  UserQueryFilters,
} from "@/types/users"
import {
  DashboardOverview,
  DashboardMetric,
  EnrollmentDataPoint,
  FacultyDistribution,
  FinancialSummary,
  PaymentRecord,
  PaymentStatus,
  StatisticalReport,
  StudentRecord,
  TutorRecord,
  GradeReport,
  StudentGradeRecord,
  DirectorFilter,
} from "../types/director.types"

const AUTH = { access_token: true } as const

// ─── Shared mappers ──────────────────────────────────────────────────────────

function mapInvoiceStatus(status: string): PaymentStatus {
  switch (status) {
    case "PAID":
      return "paid"
    case "PARTIALLY_PAID":
      return "partial"
    case "OVERDUE":
      return "overdue"
    default:
      return "unpaid" // PENDING, CANCELLED, WAIVED
  }
}

function mapStudentStatus(status: string): StudentRecord["status"] {
  switch (status) {
    case "GRADUATED":
      return "graduated"
    case "WITHDRAWN":
      return "withdrawn"
    case "DEFERRED":
      return "deferred"
    default:
      return "active" // ACTIVE, SUSPENDED, RUSTICATED
  }
}

function mapStudentRecord(s: Student): StudentRecord {
  const fullName =
    [s.user.first_name, s.user.last_name].filter(Boolean).join(" ") ||
    s.user.username
  return {
    id: String(s.id),
    matricNumber: s.matric_number,
    fullName,
    email: s.user.email,
    phone: s.user.phone_number ?? "—",
    faculty: s.faculty_name,
    department: s.department_name,
    program: s.program_name,
    level: s.current_level,
    academicYear: s.admission_date
      ? new Date(s.admission_date).getFullYear().toString()
      : "—",
    cgpa: s.current_cgpa ?? 0,
    status: mapStudentStatus(s.status),
    gender: s.gender === "MALE" ? "Male" : "Female",
  }
}

function mapTutorRecord(t: Tutor): TutorRecord {
  const fullName =
    [t.user.first_name, t.user.last_name].filter(Boolean).join(" ") ||
    t.user.username
  return {
    id: String(t.id),
    staffId: t.staff_number,
    fullName,
    email: t.user.email,
    phone: t.user.phone_number ?? "—",
    faculty: t.faculty_name,
    department: t.department_name,
    designation: t.designation,
    status: t.user.is_active ? "active" : "inactive",
  }
}

function facultyNameParam(filter?: DirectorFilter): string | undefined {
  return filter?.faculty && filter.faculty !== "all"
    ? filter.faculty
    : undefined
}

function departmentNameParam(filter?: DirectorFilter): string | undefined {
  return filter?.department && filter.department !== "all"
    ? filter.department
    : undefined
}

// ─── Fees composition (shared by Overview + Financial) ──────────────────────
// Real: GET /fees/reports/outstanding (confirmed shape, grouped by fee type —
// see payment_README.md). Unconfirmed: GET /fees/reports/summary's response
// body has no documented shape anywhere (bruno/fee/Reports - Summary.bru has
// no example). Both are queried in parallel so an unconfirmed/failing summary
// call doesn't sink the whole tab — totalExpected/totalCollected fall back to
// summing the fully-real Outstanding data if summary is unavailable or comes
// back in an unexpected shape.

async function fetchFeesSummaryData(filter?: DirectorFilter): Promise<{
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  byFeeType: FinancialSummary["byFeeType"]
  // Added 2026-09-12 — see DashboardOverview.hasLoadErrors's comment. Both
  // /fees/reports/summary and /fees/reports/outstanding 403 for DIRECTOR
  // (and BURSARY, DEAN — sandbox/fee-management/bursary_403_bug_report.md).
  // This used to swallow that behind `?? 0`/`: []`, every caller included.
  hasErrors: boolean
}> {
  const params: Record<string, unknown> = {
    facultyName: facultyNameParam(filter),
    departmentName: departmentNameParam(filter),
  }

  const [summaryRes, outstandingRes] = await Promise.allSettled([
    apiClient.get<{
      data?: {
        totalExpected?: string | number
        totalCollected?: string | number
      }
    }>("/fees/reports/summary", { ...AUTH, params }),
    apiClient.get<{
      data: {
        feeTypeId: number
        feeTypeName: string
        totalInvoiced: string
        totalPaid: string
        totalOutstanding: string
        studentCount: number
      }[]
    }>("/fees/reports/outstanding", { ...AUTH, params }),
  ])

  const byFeeType: FinancialSummary["byFeeType"] =
    outstandingRes.status === "fulfilled"
      ? outstandingRes.value.data.map((r) => ({
          feeTypeId: r.feeTypeId,
          feeType: r.feeTypeName,
          invoiced: Number(r.totalInvoiced),
          paid: Number(r.totalPaid),
          outstanding: Number(r.totalOutstanding),
          studentCount: r.studentCount,
        }))
      : []

  const totalOutstanding = byFeeType.reduce((a, f) => a + f.outstanding, 0)
  const summaryData =
    summaryRes.status === "fulfilled" ? summaryRes.value.data : undefined
  const totalExpected =
    summaryData?.totalExpected != null
      ? Number(summaryData.totalExpected)
      : byFeeType.reduce((a, f) => a + f.invoiced, 0)
  const totalCollected =
    summaryData?.totalCollected != null
      ? Number(summaryData.totalCollected)
      : byFeeType.reduce((a, f) => a + f.paid, 0)

  const hasErrors =
    summaryRes.status !== "fulfilled" || outstandingRes.status !== "fulfilled"

  return {
    totalExpected,
    totalCollected,
    totalOutstanding,
    byFeeType,
    hasErrors,
  }
}

export const directorService = {
  // ── Dashboard Overview ────────────────────────────────────────────────────

  async fetchOverview(): Promise<DashboardOverview> {
    const [statsRes, facultiesRes, programsRes, graduatedRes, feesRes] =
      await Promise.allSettled([
        usersApi.getStats(),
        facultiesApi.list(),
        programsApi.list(),
        usersApi.listStudents({ status: "GRADUATED", limit: 1 }),
        fetchFeesSummaryData(),
      ])

    const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null
    const totalStudents = stats?.total_students ?? 0
    const totalTutors = stats?.total_tutors ?? 0
    const totalFaculties =
      facultiesRes.status === "fulfilled"
        ? facultiesRes.value.data.filter((f) => f.isActive).length
        : 0
    const activePrograms =
      programsRes.status === "fulfilled"
        ? programsRes.value.data.filter((p) => p.isActive).length
        : 0
    const graduatedCount =
      graduatedRes.status === "fulfilled" ? graduatedRes.value.total : 0
    const graduationRate =
      totalStudents > 0
        ? parseFloat(((graduatedCount / totalStudents) * 100).toFixed(1))
        : 0
    const totalRevenue =
      feesRes.status === "fulfilled" ? feesRes.value.totalCollected : 0
    const pendingPayments =
      feesRes.status === "fulfilled" ? feesRes.value.totalOutstanding : 0

    // Distinguish "the underlying fetch failed" from "the real value is
    // zero" — see DashboardOverview.hasLoadErrors's comment. A card whose
    // source data 403'd shows "—", not a fabricated 0/₦0.0M.
    // fetchFeesSummaryData() never rejects (its own inner allSettled) —
    // check its `hasErrors` flag, not feesRes.status, which is always
    // "fulfilled" regardless of what happened inside it.
    const statsFailed = statsRes.status !== "fulfilled"
    const feesFailed =
      feesRes.status !== "fulfilled" || feesRes.value.hasErrors
    const graduationFailed = statsFailed || graduatedRes.status !== "fulfilled"
    const hasLoadErrors = statsFailed || feesFailed || graduationFailed

    // No historical snapshot exists anywhere for any of these KPIs (see
    // DashboardMetric's comment) — cards show the real current value only,
    // no fabricated "vs last period" trend.
    const metrics: DashboardMetric[] = [
      {
        label: "Total Students",
        value: statsFailed ? "—" : totalStudents,
        icon: "users",
      },
      {
        label: "Total Tutors",
        value: statsFailed ? "—" : totalTutors,
        icon: "book-open",
      },
      {
        label: "Total Revenue",
        value: feesFailed
          ? "—"
          : `₦${(totalRevenue / 1_000_000).toFixed(1)}M`,
        icon: "banknote",
      },
      {
        label: "Outstanding Fees",
        value: feesFailed
          ? "—"
          : `₦${(pendingPayments / 1_000_000).toFixed(1)}M`,
        icon: "alert-circle",
      },
      {
        label: "Active Programs",
        value: activePrograms,
        icon: "graduation-cap",
      },
      {
        label: "Graduation Rate",
        value: graduationFailed ? "—" : `${graduationRate}%`,
        icon: "trending-up",
      },
    ]

    return {
      totalStudents,
      totalTutors,
      totalRevenue,
      pendingPayments,
      activePrograms,
      totalFaculties,
      graduationRate,
      metrics,
      hasLoadErrors,
    }
  },

  // GET /enrollments/trend?months= — MISSING_BACKEND_APIS.md §2.8, now
  // shipped by the backend team. No time-series aggregate existed anywhere
  // in the Enrollment module before this (bruno/enrollment/*.bru is all
  // point-in-time/filtered lists).
  async fetchEnrollmentData(): Promise<EnrollmentDataPoint[]> {
    const res = await apiClient.get<{
      data: { month: string; newEnrollments: number; totalActive: number }[]
    }>("/enrollments/trend", { ...AUTH, params: { months: 12 } })
    return res.data.map((d) => ({
      month: d.month,
      students: d.totalActive,
      newEnrollments: d.newEnrollments,
    }))
  },

  // Extension of GET /users/stats's `byFaculty` — see §2.8, now shipped.
  async fetchFacultyDistribution(): Promise<FacultyDistribution[]> {
    const stats = await usersApi.getStats()
    const byFaculty = stats.data.by_faculty ?? []
    const totalStudents = byFaculty.reduce((a, f) => a + f.students, 0)
    return byFaculty.map((f) => ({
      faculty: f.faculty_name,
      students: f.students,
      tutors: f.tutors,
      percentage:
        totalStudents > 0
          ? parseFloat(((f.students / totalStudents) * 100).toFixed(1))
          : 0,
    }))
  },

  // ── Financial ─────────────────────────────────────────────────────────────

  async fetchFinancialSummary(
    filter?: DirectorFilter
  ): Promise<FinancialSummary> {
    const {
      totalExpected,
      totalCollected,
      totalOutstanding,
      byFeeType,
      hasErrors: feesFailed,
    } = await fetchFeesSummaryData(filter)
    const collectionRate =
      totalExpected > 0
        ? parseFloat(((totalCollected / totalExpected) * 100).toFixed(1))
        : 0

    // GET /fees/reports/collections-trend — see §2.8, now shipped by the
    // backend team. No time-series aggregate existed anywhere in the Fee
    // module before this; kept the try/catch below so a transient failure
    // degrades to an empty chart rather than sinking the whole tab. Also
    // 403s for DIRECTOR — confirmed live, folded into hasLoadErrors below.
    let monthlyTrend: FinancialSummary["monthlyTrend"] = []
    let trendFailed = false
    try {
      const res = await apiClient.get<{
        data: { month: string; collected: number; expected: number }[]
      }>("/fees/reports/collections-trend", { ...AUTH, params: { months: 12 } })
      monthlyTrend = res.data
    } catch {
      monthlyTrend = []
      trendFailed = true
    }

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate,
      byFeeType,
      monthlyTrend,
      hasLoadErrors: feesFailed || trendFailed,
    }
  },

  // Real endpoint (GET /fees/invoices, fee_README.md), but the admin list
  // response shape (student/faculty/department nesting) is only confirmed
  // for the student-scoped `/fees/invoices/my` variant — see §2.8 for the
  // exact shape requested. `facultyName`/`departmentName`/`level` filters are
  // proposed additions alongside the confirmed `status`/`feeTypeId`/
  // `sessionId`/`studentId`.
  async fetchPaymentRecords(
    filter?: DirectorFilter
  ): Promise<{ records: PaymentRecord[]; total: number }> {
    const params: Record<string, unknown> = {
      facultyName: facultyNameParam(filter),
      departmentName: departmentNameParam(filter),
      level:
        filter?.level && filter.level !== "all"
          ? Number(filter.level)
          : undefined,
      search: filter?.search || undefined,
      page: 1,
      limit: 100,
    }

    const res = await apiClient.get<{
      data: {
        id: number
        amount: string
        amountPaid: string
        dueDate: string
        status: string
        paidAt?: string | null
        feeType?: { name: string }
        session?: { name: string } | null
        student?: {
          id: number
          matricNumber: string
          facultyName?: string
          departmentName?: string
          programName?: string
          level?: number
          user?: { firstName: string | null; lastName: string | null }
        }
      }[]
      meta: { total: number; page: number; limit: number }
    }>("/fees/invoices", { ...AUTH, params })

    const records: PaymentRecord[] = res.data.map((inv) => {
      const student = inv.student
      const fullName =
        [student?.user?.firstName, student?.user?.lastName]
          .filter(Boolean)
          .join(" ") || "—"
      const amount = Number(inv.amount)
      const amountPaid = Number(inv.amountPaid)
      return {
        id: String(inv.id),
        studentId: student ? String(student.id) : "",
        studentName: fullName,
        matricNumber: student?.matricNumber ?? "—",
        faculty: student?.facultyName ?? "—",
        department: student?.departmentName ?? "—",
        program: student?.programName ?? "—",
        level: student?.level ?? 0,
        feeType: inv.feeType?.name ?? "—",
        academicYear: inv.session?.name ?? "—",
        amount,
        amountPaid,
        balance: amount - amountPaid,
        status: mapInvoiceStatus(inv.status),
        paymentDate: inv.paidAt ?? undefined,
        dueDate: inv.dueDate,
      }
    })

    return { records, total: res.meta.total }
  },

  // ── Statistical Reports ───────────────────────────────────────────────────

  async fetchStatisticalReport(
    filter?: DirectorFilter
  ): Promise<StatisticalReport> {
    const facultyName = facultyNameParam(filter)
    const departmentName = departmentNameParam(filter)
    const level =
      filter?.level && filter.level !== "all" ? Number(filter.level) : undefined

    const studentFilters: StudentQueryFilters = {
      search: filter?.search || undefined,
      level,
      faculty_name: facultyName,
      department_name: departmentName,
      limit: 100,
    }
    const tutorFilters: UserQueryFilters = {
      search: filter?.search || undefined,
      faculty_name: facultyName,
      department_name: departmentName,
      limit: 50,
    }

    const [studentsRes, tutorsRes, statsRes] = await Promise.allSettled([
      usersApi.listStudents(studentFilters),
      usersApi.listTutors(tutorFilters),
      usersApi.getStats(),
    ])

    const students =
      studentsRes.status === "fulfilled"
        ? studentsRes.value.data.map(mapStudentRecord)
        : []
    const totalStudents =
      studentsRes.status === "fulfilled" ? studentsRes.value.total : 0
    const tutors =
      tutorsRes.status === "fulfilled"
        ? tutorsRes.value.data.map(mapTutorRecord)
        : []
    const totalTutors =
      tutorsRes.status === "fulfilled" ? tutorsRes.value.total : 0
    const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null

    return {
      students,
      tutors,
      totalStudents,
      totalTutors,
      // Institution-wide breakdowns (proposed /users/stats extension) — not
      // re-scoped to the active filter, since no filtered-aggregate endpoint
      // exists; see §2.8.
      studentsByLevel: stats?.students_by_level ?? [],
      studentsByGender: stats?.students_by_gender ?? { male: 0, female: 0 },
      tutorsByDesignation: stats?.tutors_by_designation ?? [],
      // Added 2026-09-12 — see DashboardOverview.hasLoadErrors's comment.
      // All three of these 403 for DIRECTOR, confirmed live.
      hasLoadErrors:
        studentsRes.status !== "fulfilled" ||
        tutorsRes.status !== "fulfilled" ||
        statsRes.status !== "fulfilled",
    }
  },

  // ── Grade Reports ─────────────────────────────────────────────────────────
  // Real (pending) endpoint — see sandbox/result/missing_grade_apis.readme.md
  // §8. No bruno/director collection and no `.bru` file exist for this yet;
  // wired against the designed contract so this starts working the moment
  // the backend ships it. `faculty`/`department`/`program`/`semester` are
  // sent as display-name strings (not FK ids) because DirectorFilterBar
  // (shared with Overview/Financial/Statistical) only collects free-text/
  // display values — see §8's note on that assumption.

  async fetchGradeReport(filter?: DirectorFilter): Promise<GradeReport> {
    const params: Record<string, unknown> = {}
    if (filter?.faculty && filter.faculty !== "all")
      params.facultyName = filter.faculty
    if (filter?.department && filter.department !== "all")
      params.departmentName = filter.department
    if (filter?.program && filter.program !== "all")
      params.programName = filter.program
    if (filter?.level && filter.level !== "all")
      params.level = Number(filter.level)
    if (filter?.semester && filter.semester !== "all")
      params.semesterName = filter.semester
    if (filter?.academicYear) params.academicYear = filter.academicYear
    if (filter?.status && filter.status !== "all") params.status = filter.status
    if (filter?.search) params.search = filter.search

    const res = await apiClient.get<{
      data: {
        summary: {
          averageGPA: number
          passRate: number
          distinctionRate: number
          totalRecords: number
        }
        gradeDistribution: {
          grade: string
          count: number
          percentage: number
        }[]
        byFaculty: {
          faculty: string
          studentCount: number
          averageGPA: number
        }[]
        records: StudentGradeRecord[]
      }
      meta: { total: number; page: number; limit: number }
    }>("/results/reports/director-grade-summary", { ...AUTH, params })

    return {
      records: res.data.records,
      gradeDistribution: res.data.gradeDistribution,
      averageGPA: res.data.summary.averageGPA,
      passRate: res.data.summary.passRate,
      distinctionRate: res.data.summary.distinctionRate,
      byFaculty: res.data.byFaculty,
      pagination: res.meta,
    }
  },
}
