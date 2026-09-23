import type {
  GradeFilters,
  GradesGroupBy,
  PublishSelectionFilters,
} from "../types/grades.types"

export const gradesKeys = {
  all: ["grades"] as const,

  gradeScales: () => [...gradesKeys.all, "grade-scales"] as const,

  byCourseAndSemester: (courseId: number, semesterId: number) =>
    [...gradesKeys.all, "by-course-semester", courseId, semesterId] as const,

  detail: (id: number | null) => [...gradesKeys.all, "detail", id] as const,

  coursesByProgram: (programId: string | null) =>
    [...gradesKeys.all, "courses-by-program", programId] as const,

  list: (filters: GradeFilters, page: number, pageSize: number) =>
    [...gradesKeys.all, "list", filters, page, pageSize] as const,

  transcript: (studentId: number | null) =>
    [...gradesKeys.all, "transcript", studentId] as const,

  cgpa: (studentId: number | null) =>
    [...gradesKeys.all, "cgpa", studentId] as const,

  // majorProgramId included in every analytics key below so switching the
  // major-program filter tab (Major-Program Scoping) doesn't read a stale
  // cache entry from a different scope.
  dashboard: (majorProgramId?: number | null) =>
    [...gradesKeys.all, "dashboard", majorProgramId ?? null] as const,
  distribution: (majorProgramId?: number | null) =>
    [...gradesKeys.all, "distribution", majorProgramId ?? null] as const,
  programPerformance: (majorProgramId?: number | null) =>
    [...gradesKeys.all, "program-performance", majorProgramId ?? null] as const,
  cgpaTrends: (majorProgramId?: number | null) =>
    [...gradesKeys.all, "cgpa-trends", majorProgramId ?? null] as const,
  topPerformers: (limit: number, majorProgramId?: number | null) =>
    [
      ...gradesKeys.all,
      "top-performers",
      limit,
      majorProgramId ?? null,
    ] as const,

  grouped: (groupBy: GradesGroupBy, filters: GradeFilters) =>
    [...gradesKeys.all, "grouped", groupBy, filters] as const,

  publishPreview: (filters: PublishSelectionFilters) =>
    [...gradesKeys.all, "publish-preview", filters] as const,
} as const
