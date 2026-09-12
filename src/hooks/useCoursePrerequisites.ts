import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  coursePrerequisiteKeys,
  coursePrerequisiteMutationOptions,
  coursePrerequisiteQueryOptions,
} from "@/services/coursePrerequisiteApi"

export function useCoursePrerequisites(courseId: number | null) {
  return useQuery({
    ...coursePrerequisiteQueryOptions.byCourse(courseId ?? 0),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAddPrerequisite() {
  const qc = useQueryClient()
  return useMutation({
    ...coursePrerequisiteMutationOptions.add(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: coursePrerequisiteKeys.byCourse(variables.courseId),
      })
    },
  })
}

export function useRemovePrerequisite() {
  const qc = useQueryClient()
  return useMutation({
    ...coursePrerequisiteMutationOptions.remove(),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({
        queryKey: coursePrerequisiteKeys.byCourse(variables.courseId),
      })
    },
  })
}
