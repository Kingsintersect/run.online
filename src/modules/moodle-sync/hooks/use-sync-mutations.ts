"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"
import type {
  CoursesBulkPushPayload,
  PushCategoryDto,
  ResolveCategoryMappingDto,
  UsersBulkPushPayload,
  UpdateVisibilityPayload,
  ReconcileModule,
  ResetModule,
} from "../types"

// ---------- Category mutations ----------

export function usePushCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: PushCategoryDto) => moodleSyncService.pushCategory(dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

// Replaces the old faculty-only usePushHierarchy — any AcademicUnit node can
// root a subtree push now, not just a Faculty.
export function usePushSubtree() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rootUnitId: number) =>
      moodleSyncService.pushSubtree(rootUnitId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

export function usePullCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullCategories,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

export function usePullCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCategoryId: number) =>
      moodleSyncService.pullCategory(moodleCategoryId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

export function useResolveCategoryMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ResolveCategoryMappingDto }) =>
      moodleSyncService.resolveCategoryMapping(id, dto),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

export function useDeleteCategoryMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => moodleSyncService.deleteCategoryMapping(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.categoriesAll() }),
  })
}

// ---------- User mutations ----------

export function usePushUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: number) => moodleSyncService.pushUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: moodleSyncKeys.users() }),
  })
}

export function usePushUsersBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UsersBulkPushPayload) =>
      moodleSyncService.pushUsersBulk(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: moodleSyncKeys.users() }),
  })
}

export function usePullUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullUsers,
    onSuccess: () => qc.invalidateQueries({ queryKey: moodleSyncKeys.users() }),
  })
}

export function usePullUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleUserId: number) =>
      moodleSyncService.pullUser(moodleUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: moodleSyncKeys.users() }),
  })
}

// ---------- Course mutations ----------

export function usePushCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseOfferingId: number) =>
      moodleSyncService.pushCourse(courseOfferingId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.coursesAll() }),
  })
}

export function usePushCoursesBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CoursesBulkPushPayload) =>
      moodleSyncService.pushCoursesBulk(payload),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.coursesAll() }),
  })
}

export function usePullCourses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullCourses,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.coursesAll() }),
  })
}

export function usePullCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.pullCourse(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.coursesAll() }),
  })
}

// ---------- Enrollment mutations ----------

export function usePushEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: number) =>
      moodleSyncService.pushEnrollment(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollments() })
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentErrors() })
    },
  })
}

export function usePushAllEnrollments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pushAllEnrollments,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollments() })
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentErrors() })
    },
  })
}

export function usePullEnrollments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.pullEnrollments(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollments() }),
  })
}

// ---------- Admin-only pull actions for read-only domains ----------

export function usePullAssessments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.pullAssessments(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.all, "assessments"],
      }),
  })
}

export function usePullAllAssessments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullAllAssessments,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.all, "assessments"],
      }),
  })
}

export function useRetryAssessmentSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.retryAssessmentSync(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.all, "assessments"],
      }),
  })
}

export function useUpdateAssessmentVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateVisibilityPayload
    }) => moodleSyncService.updateAssessmentVisibility(id, payload),
    onSuccess: (_data, { id }) =>
      Promise.all([
        qc.invalidateQueries({
          queryKey: [...moodleSyncKeys.all, "assessments"],
        }),
        qc.invalidateQueries({ queryKey: moodleSyncKeys.assessment(id) }),
      ]),
  })
}

export function useDeleteAssessmentMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => moodleSyncService.deleteAssessmentMapping(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.all, "assessments"],
      }),
  })
}

export function usePullGrades() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.pullGrades(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...moodleSyncKeys.all, "grades"] }),
  })
}

export function usePullAllGrades() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullAllGrades,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...moodleSyncKeys.all, "grades"] }),
  })
}

export function usePullCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.pullCalendar,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...moodleSyncKeys.all, "calendar"] }),
  })
}

export function usePullCalendarForCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.pullCalendarForCourse(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...moodleSyncKeys.all, "calendar"] }),
  })
}

// ---------- Reconcile & Reset — sandbox/moodle-sync-reconciliation/ ----------

const RECONCILE_INVALIDATION: Record<ReconcileModule, readonly unknown[]> = {
  categories: moodleSyncKeys.categoriesAll(),
  courses: moodleSyncKeys.coursesAll(),
  users: [...moodleSyncKeys.all, "users"],
}

const RESET_INVALIDATION: Record<ResetModule, readonly unknown[]> = {
  assessments: [...moodleSyncKeys.all, "assessments"],
  calendar: moodleSyncKeys.calendar(),
  grades: [...moodleSyncKeys.all, "grades"],
}

// A POST that writes nothing — modelled as a mutation, not a query, because it
// hits live Moodle and each run is a fresh point-in-time snapshot.
export function usePreviewReconcile() {
  return useMutation({
    mutationFn: (module: ReconcileModule) =>
      moodleSyncService.previewReconcile(module),
  })
}

export function useApplyReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      module,
      previewId,
    }: {
      module: ReconcileModule
      previewId: string
    }) => moodleSyncService.applyReconcile(module, previewId),
    onSuccess: (_data, { module }) =>
      qc.invalidateQueries({ queryKey: RECONCILE_INVALIDATION[module] }),
  })
}

export function useResetModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      module,
      repull,
    }: {
      module: ResetModule
      repull: boolean
    }) => moodleSyncService.resetModule(module, repull),
    onSuccess: (_data, { module }) =>
      qc.invalidateQueries({ queryKey: RESET_INVALIDATION[module] }),
  })
}

// ---------- Enrollment drift — sandbox/moodle-sync-reconciliation/ENROLLMENT_DRIFT.md ----------

export function useCheckCourseEnrollments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (moodleCourseId: number) =>
      moodleSyncService.checkCourseEnrollments(moodleCourseId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentDriftAll() }),
  })
}

export function useStartDriftScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: moodleSyncService.startDriftScan,
    // Seeding the RUNNING status starts useDriftScanStatus polling immediately.
    onSuccess: (status) =>
      qc.setQueryData(moodleSyncKeys.enrollmentDriftScan(), status),
  })
}

export function useReEnrollDrift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => moodleSyncService.reEnrollDrift(id),
    // Re-enrolling pushes the portal enrollment, so the sync rows and the
    // errors list change too — refresh the whole enrollments tree.
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: [...moodleSyncKeys.all, "enrollments"],
      }),
  })
}

export function useUnenrolDrift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      moodleSyncService.unenrolDrift(id, reason),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentDriftAll() }),
  })
}

export function useDismissDrift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      moodleSyncService.dismissDrift(id, reason),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentDriftAll() }),
  })
}

export function useReopenDrift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => moodleSyncService.reopenDrift(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: moodleSyncKeys.enrollmentDriftAll() }),
  })
}
