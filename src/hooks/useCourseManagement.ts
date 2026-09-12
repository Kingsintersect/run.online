import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  courseManagementKeys,
  courseManagementMutationOptions,
  courseManagementQueryOptions,
  type CourseListFilters,
} from "@/services/courseManagementApi"

// ── Courses ─────────────────────────────────

export function useCourses(filters?: CourseListFilters) {
  return useQuery({
    ...courseManagementQueryOptions.courses.list(filters),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCourse(id: number | null) {
  return useQuery({
    ...courseManagementQueryOptions.courses.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...courseManagementMutationOptions.createCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseManagementKeys.courses.all })
    },
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...courseManagementMutationOptions.updateCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseManagementKeys.courses.all })
    },
  })
}

export function useDeactivateCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...courseManagementMutationOptions.deactivateCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseManagementKeys.courses.all })
    },
  })
}

// ── Program Courses ─────────────────────────

export function useProgramCoursesByProgram(programId: number | null) {
  return useQuery({
    ...courseManagementQueryOptions.programCourses.byProgram(programId ?? 0),
    enabled: !!programId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAssignCourseToProgram() {
  const qc = useQueryClient()
  return useMutation({
    ...courseManagementMutationOptions.assignCourseToProgram(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseManagementKeys.programCourses.all,
      })
    },
  })
}

export function useRemoveProgramCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...courseManagementMutationOptions.removeProgramCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseManagementKeys.programCourses.all,
      })
    },
  })
}
