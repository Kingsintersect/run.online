export interface ReportCourse {
  id: string
  courseCode: string
  courseTitle: string
  creditLoad: number
  score: number
  grade: string
  gradePoint: number
  qualityPoints: number
  semesterName: string
  academicYear: string
  status: string
}

export interface ReportStudentInfo {
  fullName: string
  regNumber: string
  program: string
  level: string
  department: string
  email: string
  avatarUrl: string | null
}

/** How many courses got each letter grade, as the backend graded them. */
export interface ReportGradeDistributionItem {
  grade: string
  count: number
  percentage: number
}

export interface ReportSummary {
  /** The backend's semester GPA; null until it has been computed. */
  gpa: number | null
  /** The backend's CGPA after this semester; null until computed. */
  cgpa: number | null
  totalCredits: number
  totalQualityPoints: number
  gradeDistribution: ReportGradeDistributionItem[]
}
