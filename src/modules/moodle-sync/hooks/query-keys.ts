import type { UserSyncQueryFilters, AssessmentFilter } from "../types"

export const moodleSyncKeys = {
  all: ["moodle-sync"] as const,

  categories: () => [...moodleSyncKeys.all, "categories"] as const,
  category: (id: number) => [...moodleSyncKeys.categories(), id] as const,
  categoriesNeedingMapping: () =>
    [...moodleSyncKeys.categories(), "needs-mapping"] as const,

  // Multi-Program Platform — sandbox/multi-program-platform/
  cohorts: () => [...moodleSyncKeys.all, "cohorts"] as const,

  users: (filters?: UserSyncQueryFilters) =>
    [...moodleSyncKeys.all, "users", filters] as const,
  user: (id: number) => [...moodleSyncKeys.all, "users", id] as const,
  unmatchedUsers: () => [...moodleSyncKeys.all, "users", "unmatched"] as const,

  courses: () => [...moodleSyncKeys.all, "courses"] as const,
  course: (id: number) => [...moodleSyncKeys.courses(), id] as const,

  enrollments: (filters?: { status?: string }) =>
    [...moodleSyncKeys.all, "enrollments", filters] as const,
  enrollmentErrors: () =>
    [...moodleSyncKeys.all, "enrollments", "errors"] as const,

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
