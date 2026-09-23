import type {
  UserSyncQueryFilters,
  AssessmentFilter,
  EnrollmentDriftFilters,
} from "../types"

export const moodleSyncKeys = {
  all: ["moodle-sync"] as const,

  // Major-Program Scoping — sandbox/BACKEND_DEVIATIONS_2026-09-14.md A35.
  // `categoriesAll()`/`coursesAll()` are filters-agnostic prefixes — kept
  // separate from the filtered list keys below (which fold `majorProgramId`
  // in) so every mutation's invalidation still prefix-matches the list
  // query regardless of which filter it was fetched with. Embedding filters
  // directly in the key mutations invalidate by is exactly the bug this
  // codebase already hit and fixed once — see BACKEND_DEVIATIONS_2026-09-14
  // A20 ("Fee Types/Invoices lists didn't refresh after create/...").
  categoriesAll: () => [...moodleSyncKeys.all, "categories"] as const,
  categories: (filters?: { majorProgramId?: number }) =>
    [...moodleSyncKeys.categoriesAll(), "list", filters] as const,
  category: (id: number) =>
    [...moodleSyncKeys.categoriesAll(), "detail", id] as const,
  categoriesNeedingMapping: (filters?: { majorProgramId?: number }) =>
    [...moodleSyncKeys.categoriesAll(), "needs-mapping", filters] as const,

  // Multi-Program Platform — sandbox/multi-program-platform/
  cohorts: () => [...moodleSyncKeys.all, "cohorts"] as const,

  users: (filters?: UserSyncQueryFilters) =>
    [...moodleSyncKeys.all, "users", filters] as const,
  user: (id: number) => [...moodleSyncKeys.all, "users", id] as const,
  unmatchedUsers: () => [...moodleSyncKeys.all, "users", "unmatched"] as const,

  // A35 — same filters-agnostic-prefix reasoning as categoriesAll() above.
  coursesAll: () => [...moodleSyncKeys.all, "courses"] as const,
  courses: (filters?: { majorProgramId?: number }) =>
    [...moodleSyncKeys.coursesAll(), "list", filters] as const,
  course: (id: number) =>
    [...moodleSyncKeys.coursesAll(), "detail", id] as const,

  enrollments: (filters?: { status?: string; majorProgramId?: number }) =>
    [...moodleSyncKeys.all, "enrollments", filters] as const,
  enrollmentErrors: () =>
    [...moodleSyncKeys.all, "enrollments", "errors"] as const,

  // Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md
  enrollmentDriftAll: () =>
    [...moodleSyncKeys.all, "enrollments", "drift"] as const,
  enrollmentDrift: (filters?: EnrollmentDriftFilters) =>
    [...moodleSyncKeys.all, "enrollments", "drift", "list", filters] as const,
  enrollmentDriftSummary: () =>
    [...moodleSyncKeys.all, "enrollments", "drift", "summary"] as const,
  enrollmentDriftScan: () =>
    [...moodleSyncKeys.all, "enrollments", "drift", "scan"] as const,

  assessments: (filters?: { courseId?: number; type?: string }) =>
    [...moodleSyncKeys.all, "assessments", filters] as const,
  assessmentsByCourse: (courseOfferingId: number) =>
    [...moodleSyncKeys.all, "assessments", "course", courseOfferingId] as const,
  assessmentsUpcoming: () =>
    [...moodleSyncKeys.all, "assessments", "upcoming"] as const,
  assessmentsList: (filters?: Partial<AssessmentFilter>) =>
    [...moodleSyncKeys.all, "assessments", "list", filters] as const,
  assessment: (id: number) =>
    [...moodleSyncKeys.all, "assessments", "detail", id] as const,
  assessmentsMy: (filters?: object) =>
    [...moodleSyncKeys.all, "assessments", "my", filters] as const,
  assessmentSyncStatus: () =>
    [...moodleSyncKeys.all, "assessments", "sync-status"] as const,

  grades: (filters?: { courseId?: number; userId?: number }) =>
    [...moodleSyncKeys.all, "grades", filters] as const,
  gradesByCourse: (courseOfferingId: number) =>
    [...moodleSyncKeys.all, "grades", "course", courseOfferingId] as const,
  myGrades: () => [...moodleSyncKeys.all, "grades", "my"] as const,

  calendar: () => [...moodleSyncKeys.all, "calendar"] as const,
  calendarByCourse: (courseOfferingId: number) =>
    [...moodleSyncKeys.all, "calendar", "course", courseOfferingId] as const,
  calendarUpcoming: () =>
    [...moodleSyncKeys.all, "calendar", "upcoming"] as const,
  calendarEvent: (id: number) => [...moodleSyncKeys.calendar(), id] as const,
} as const
