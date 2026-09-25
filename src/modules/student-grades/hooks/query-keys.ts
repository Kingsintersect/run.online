import type {
  GradeFilters,
  GradesGroupBy,
  PublishSelectionFilters,
} from "../types/grades.types"
import type {
  AdjustmentQueueFilters,
  PullJobFilters,
  ResultSheetFilters,
} from "../types"

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

// ─── Results from Moodle (contract C7) ─────────────────────────────────────
// Separate namespace from `gradesKeys`: sheet-level mutations invalidate the
// precise slices below, and publishing also invalidates `gradesKeys.all`
// (analytics, CGPA, transcripts all read published grades).
export const resultsKeys = {
  all: ["results"] as const,

  sheetsAll: () => [...resultsKeys.all, "sheets"] as const,
  sheets: (filters: ResultSheetFilters) =>
    [...resultsKeys.sheetsAll(), filters] as const,
  // `*All()` prefixes match every offering's entry (used after a Moodle
  // pull, which can touch any sheet).
  sheetDetailAll: () => [...resultsKeys.all, "sheet"] as const,
  sheet: (offeringId: number) =>
    [...resultsKeys.sheetDetailAll(), offeringId] as const,
  gradeItemsAll: () => [...resultsKeys.all, "grade-items"] as const,
  gradeItems: (offeringId: number) =>
    [...resultsKeys.gradeItemsAll(), offeringId] as const,
  adjustmentsAll: () => [...resultsKeys.all, "adjustments"] as const,
  adjustments: (offeringId: number) =>
    [...resultsKeys.adjustmentsAll(), offeringId] as const,
  adjustmentQueueAll: () => [...resultsKeys.all, "adjustment-queue"] as const,
  adjustmentQueue: (filters: AdjustmentQueueFilters) =>
    [...resultsKeys.adjustmentQueueAll(), filters] as const,

  pullJob: (id: number) => [...resultsKeys.all, "pull-job", id] as const,
  pullJobsAll: () => [...resultsKeys.all, "pull-jobs"] as const,
  pullJobs: (filters: PullJobFilters) =>
    [...resultsKeys.pullJobsAll(), filters] as const,

  publishPreviewAll: () => [...resultsKeys.all, "publish-preview"] as const,
  publishPreview: (semesterId: number, majorProgramId: number | null) =>
    [...resultsKeys.publishPreviewAll(), semesterId, majorProgramId] as const,

  schemesAll: () => [...resultsKeys.all, "schemes"] as const,
  schemes: (majorProgramId: number | null) =>
    [...resultsKeys.schemesAll(), majorProgramId] as const,
  schemeResolution: (programId: number) =>
    [...resultsKeys.schemesAll(), "resolve", programId] as const,
  policy: (majorProgramId: number) =>
    [...resultsKeys.all, "policy", majorProgramId] as const,

  resultStatus: (semesterId: number) =>
    [...resultsKeys.all, "result-status", semesterId] as const,
  studentGrades: (studentId: number) =>
    [...resultsKeys.all, "student-grades", studentId] as const,
} as const
