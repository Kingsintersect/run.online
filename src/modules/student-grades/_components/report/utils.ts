import type { AppUser } from "@/store/appStore"
import type { StudentGrade } from "../../types"
import type {
  ReportCourse,
  ReportGradeDistributionItem,
  ReportStudentInfo,
  ReportSummary,
} from "./types"

// No grading thresholds live here. Letter grades and grade points come from
// the backend's grading scheme on each published grade, and GPA/CGPA from the
// backend's CGPA history. Class of degree isn't returned by the backend yet
// (sandbox/result-documents/CLASS_OF_DEGREE.md), so the report doesn't show it.

// Published StudentGrade rows only (contract C8) — a student never renders
// anything else.
export function toReportCourses(grades: StudentGrade[]): ReportCourse[] {
  return [...grades]
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode))
    .map((grade) => ({
      id: String(grade.id),
      courseCode: grade.courseCode,
      courseTitle: grade.courseTitle,
      creditLoad: grade.creditUnits,
      score: grade.totalScore ?? 0,
      grade: grade.grade ?? "—",
      gradePoint: grade.gradePoint ?? 0,
      qualityPoints: (grade.gradePoint ?? 0) * grade.creditUnits,
      semesterName: grade.semesterName,
      academicYear: grade.academicSession,
      status: "PUBLISHED",
    }))
}

/**
 * Totals for the loaded courses plus the backend's own GPA/CGPA for the
 * semester (GET /results/cgpa/student/:id). GPA is never recomputed here, so
 * the report can't disagree with the registry; it's null until the backend
 * has computed it.
 */
export function calculateReportSummary(
  courses: ReportCourse[],
  official: { gpa: number; cgpa: number } | null
): ReportSummary {
  const totalCredits = courses.reduce((sum, c) => sum + c.creditLoad, 0)
  const totalQualityPoints = courses.reduce(
    (sum, c) => sum + c.qualityPoints,
    0
  )

  // Letters as graded, best grade point first.
  const byGrade = new Map<string, { count: number; point: number }>()
  for (const c of courses) {
    const cur = byGrade.get(c.grade) ?? { count: 0, point: c.gradePoint }
    byGrade.set(c.grade, {
      count: cur.count + 1,
      point: Math.max(cur.point, c.gradePoint),
    })
  }
  const gradeDistribution: ReportGradeDistributionItem[] = [...byGrade]
    .sort((x, y) => y[1].point - x[1].point || x[0].localeCompare(y[0]))
    .map(([grade, { count }]) => ({
      grade,
      count,
      percentage: courses.length
        ? Math.round((count / courses.length) * 100)
        : 0,
    }))

  return {
    gpa: official?.gpa ?? null,
    cgpa: official?.cgpa ?? null,
    totalCredits,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    gradeDistribution,
  }
}

export function buildReportStudentInfo(
  user: AppUser | null,
  programName: string
): ReportStudentInfo {
  return {
    fullName: user?.name ?? "—",
    regNumber: user?.matricNo ?? "—",
    program: programName,
    level: user?.level ?? "",
    department: user?.department ?? programName,
    email: user?.email ?? "",
    avatarUrl: user?.avatar ?? null,
  }
}

export function formatSemesterLabel(semesterName: string) {
  return semesterName.endsWith("Semester")
    ? semesterName
    : `${semesterName} Semester`
}
