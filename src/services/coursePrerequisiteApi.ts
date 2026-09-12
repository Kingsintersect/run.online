import apiClient, {
  createApiMutationOptions,
  createApiQueryOptions,
} from "@/lib/clients/apiClient"
import type { CoursePrerequisite } from "@/types/school"

// Real backend contract per bruno/course (Prerequisite - List/Add/Remove)
// and sandbox/course/course_README.md — source of truth, see CLAUDE.md §13.
const AUTH = { access_token: true } as const

export const prerequisitesApi = {
  async list(courseId: number): Promise<{ data: CoursePrerequisite[] }> {
    return apiClient.get<{ data: CoursePrerequisite[] }>(
      `/courses/${courseId}/prerequisites`,
      AUTH
    )
  },

  async add(courseId: number, prerequisiteId: number): Promise<void> {
    await apiClient.post(
      `/courses/${courseId}/prerequisites`,
      { prerequisiteId },
      AUTH
    )
  },

  // Path param is the prerequisite COURSE's id, not a separate junction id.
  async remove(courseId: number, prerequisiteId: number): Promise<void> {
    return apiClient.delete<void>(
      `/courses/${courseId}/prerequisites/${prerequisiteId}`,
      AUTH
    )
  },
}

export const coursePrerequisiteKeys = {
  all: ["course-prerequisites"] as const,
  byCourse: (courseId: number) =>
    [...coursePrerequisiteKeys.all, courseId] as const,
}

export const coursePrerequisiteQueryOptions = {
  byCourse: (courseId: number) =>
    createApiQueryOptions({
      queryKey: coursePrerequisiteKeys.byCourse(courseId),
      queryFn: () => prerequisitesApi.list(courseId),
    }),
}

export const coursePrerequisiteMutationOptions = {
  add: () =>
    createApiMutationOptions<
      void,
      { courseId: number; prerequisiteId: number }
    >({
      mutationKey: [...coursePrerequisiteKeys.all, "add"],
      mutationFn: ({ courseId, prerequisiteId }) =>
        prerequisitesApi.add(courseId, prerequisiteId),
    }),
  remove: () =>
    createApiMutationOptions<
      void,
      { courseId: number; prerequisiteId: number }
    >({
      mutationKey: [...coursePrerequisiteKeys.all, "remove"],
      mutationFn: ({ courseId, prerequisiteId }) =>
        prerequisitesApi.remove(courseId, prerequisiteId),
    }),
}
