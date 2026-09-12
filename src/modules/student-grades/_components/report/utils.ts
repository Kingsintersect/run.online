import type { AppUser } from "@/store/appStore"
import { UNIVERSITY_NAME } from "@/config/global.config"
import type { Grade, StudentTranscript } from "../../types/grades.types"
import type {
  ReportCourse,
  ReportGradeDistributionItem,
  ReportStudentInfo,
  ReportSummary,
} from "./types"

const GRADE_META: Array<{
  grade: string
  label: string
  colorClass: string
  textClass: string
}> = [
  {
    grade: "A",
    label: "Excellent (70-100%)",
    colorClass: "bg-emerald-500",
    textClass: "text-emerald-600",
  },
  {
    grade: "AB",
    label: "Very Good (60-69%)",
    colorClass: "bg-teal-500",
    textClass: "text-teal-600",
  },
  {
    grade: "B",
    label: "Good (50-59%)",
    colorClass: "bg-blue-500",
    textClass: "text-blue-600",
  },
  {
    grade: "BC",
    label: "Above Average (45-49%)",
    colorClass: "bg-indigo-500",
    textClass: "text-indigo-600",
  },
  {
    grade: "C",
    label: "Average (40-44%)",
    colorClass: "bg-violet-500",
    textClass: "text-violet-600",
  },
  {
    grade: "CD",
    label: "Below Average (35-39%)",
    colorClass: "bg-orange-500",
    textClass: "text-orange-600",
  },
  {
    grade: "D",
    label: "Pass (30-34%)",
    colorClass: "bg-amber-500",
    textClass: "text-amber-600",
  },
  {
    grade: "F",
    label: "Fail (0-29%)",
    colorClass: "bg-red-500",
    textClass: "text-red-600",
  },
]

export function toReportCourses(grades: Grade[]): ReportCourse[] {
  return [...grades]
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode))
    .map((grade) => ({
      id: String(grade.id),
      courseCode: grade.courseCode,
      courseTitle: grade.courseName,
      creditLoad: grade.creditUnits,
      score: grade.totalScore ?? 0,
      grade: grade.gradeLetter ?? "F",
      gradePoint: grade.gradePoint ?? 0,
      qualityPoints: (grade.gradePoint ?? 0) * grade.creditUnits,
      semesterName: grade.semesterName,
      academicYear: grade.academicYear,
      status: grade.status,
    }))
}

// `authoritativeGpa`, when given, is the backend-computed semester GPA from
// the matching CgpaHistory entry (GET /results/cgpa/student/:studentId) — the
// Registrar's own number, used instead of a client-side recomputation so this
// report can never silently diverge from what the backend considers correct
// (rounding, carryover handling, etc.). Only falls back to recomputing from
// the loaded courses when no matching history entry exists yet (e.g. the
// backend hasn't run CGPA - Calculate for this semester).
export function calculateReportSummary(
  courses: ReportCourse[],
  authoritativeGpa: number | null = null
): ReportSummary {
  const totalCredits = courses.reduce(
    (sum, course) => sum + course.creditLoad,
    0
  )
  const totalQualityPoints = courses.reduce(
    (sum, course) => sum + course.qualityPoints,
    0
  )
  const gpa =
    authoritativeGpa ??
    (totalCredits > 0
      ? Number((totalQualityPoints / totalCredits).toFixed(2))
      : 0)

  const gradeDistribution: ReportGradeDistributionItem[] = GRADE_META.map(
    (meta) => {
      const count = courses.filter(
        (course) => course.grade.toUpperCase() === meta.grade
      ).length
      const percentage =
        courses.length > 0 ? Math.round((count / courses.length) * 100) : 0
      return {
        ...meta,
        count,
        percentage,
      }
    }
  )

  return {
    gpa,
    totalCredits,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    degreeClass: getDegreeClass(gpa),
    academicStanding: getAcademicStanding(gpa),
    gradeDistribution,
  }
}

export function buildReportStudentInfo(
  transcript: StudentTranscript,
  user: AppUser | null
): ReportStudentInfo {
  return {
    fullName: user?.name ?? transcript.studentName,
    regNumber: user?.matricNo ?? transcript.studentMatric,
    program: transcript.programName,
    level: user?.level ?? transcript.level,
    department: user?.department ?? transcript.programName,
    email: user?.email ?? transcript.studentEmail,
    avatarUrl: user?.avatar ?? null,
  }
}

export function getInstitutionSubtitle() {
  return `${UNIVERSITY_NAME} 5.00 grading system`
}

export function formatSemesterLabel(semesterName: string) {
  return semesterName.endsWith("Semester")
    ? semesterName
    : `${semesterName} Semester`
}

export function getAcademicStanding(gpa: number) {
  if (gpa >= 4.5) {
    return {
      text: "First Class",
      color: "text-emerald-700",
      bgColor: "bg-emerald-500",
    }
  }
  if (gpa >= 3.5) {
    return {
      text: "Second Class Upper",
      color: "text-blue-700",
      bgColor: "bg-blue-500",
    }
  }
  if (gpa >= 2.4) {
    return {
      text: "Second Class Lower",
      color: "text-violet-700",
      bgColor: "bg-violet-500",
    }
  }
  if (gpa >= 1.5) {
    return {
      text: "Third Class",
      color: "text-amber-700",
      bgColor: "bg-amber-500",
    }
  }
  if (gpa >= 1.0) {
    return {
      text: "Pass",
      color: "text-slate-700",
      bgColor: "bg-slate-500",
    }
  }
  return {
    text: "Fail",
    color: "text-red-700",
    bgColor: "bg-red-500",
  }
}

function getDegreeClass(gpa: number) {
  if (gpa >= 4.5) return "First Class"
  if (gpa >= 3.5) return "Second Class Upper"
  if (gpa >= 2.4) return "Second Class Lower"
  if (gpa >= 1.5) return "Third Class"
  if (gpa >= 1.0) return "Pass"
  return "Fail"
}
