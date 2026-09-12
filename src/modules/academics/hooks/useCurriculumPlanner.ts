import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  curriculumKeys,
  curriculumMutationOptions,
  curriculumQueryOptions,
} from "@/services/curriculumApi"

export function useCurriculumPrograms() {
  return useQuery({
    ...curriculumQueryOptions.programs(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCurriculumProgramCourses(programId: number | null) {
  return useQuery({
    ...curriculumQueryOptions.programCourses(programId ?? 0),
    enabled: !!programId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useUpdateCourseCurriculumSemester(programId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    ...curriculumMutationOptions.updateCourseCurriculumSemester(),
    onSuccess: async () => {
      if (!programId) return
      await qc.invalidateQueries({
        queryKey: curriculumKeys.courses(programId),
      })
    },
  })
}
