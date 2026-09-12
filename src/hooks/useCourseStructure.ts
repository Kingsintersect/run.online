import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  courseStructureKeys,
  courseStructureMutationOptions,
  courseStructureQueryOptions,
} from "@/services/courseStructureApi"
import type {
  UpdateFacultyPayload,
  UpdateDepartmentPayload,
  UpdateProgramPayload,
} from "@/types/school"

// ── Faculties ───────────────────────────────

export function useFaculties() {
  return useQuery({
    ...courseStructureQueryOptions.faculties.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useFaculty(id: number | null) {
  return useQuery({
    ...courseStructureQueryOptions.faculties.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

/** Users holding the `dean` role — the picker source for Faculty.deanUserId. */
export function useEligibleDeans() {
  return useQuery({
    ...courseStructureQueryOptions.faculties.eligibleDeans(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateFaculty() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.createFaculty(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseStructureKeys.faculties.all,
      })
    },
  })
}

export function useUpdateFaculty() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.updateFaculty(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateFacultyPayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.faculties.all }),
        qc.invalidateQueries({
          queryKey: courseStructureKeys.faculties.detail(variables.id),
        }),
      ])
    },
  })
}

export function useDeactivateFaculty() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.deactivateFaculty(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseStructureKeys.faculties.all,
      })
    },
  })
}

// ── Departments ─────────────────────────────

export function useAllDepartments() {
  return useQuery({
    ...courseStructureQueryOptions.departments.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useDepartments(facultyId: number | null) {
  return useQuery({
    ...courseStructureQueryOptions.departments.byFaculty(facultyId!),
    enabled: !!facultyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDepartment(id: number | null) {
  return useQuery({
    ...courseStructureQueryOptions.departments.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.createDepartment(),
    onSuccess: async (_, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.departments.all }),
        // A Department created under a SECONDARY_SCHOOL/PG-style structure
        // may have no parent Faculty — see school.d.ts's CreateDepartmentPayload.
        ...(variables.facultyId !== null
          ? [
              qc.invalidateQueries({
                queryKey: courseStructureKeys.faculties.detail(
                  variables.facultyId
                ),
              }),
            ]
          : []),
      ])
    },
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.updateDepartment(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateDepartmentPayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.departments.all }),
        qc.invalidateQueries({
          queryKey: courseStructureKeys.departments.detail(variables.id),
        }),
      ])
    },
  })
}

export function useDeactivateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.deactivateDepartment(),
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: courseStructureKeys.departments.all,
      })
    },
  })
}

// ── Programs ────────────────────────────────

export function useAllPrograms() {
  return useQuery({
    ...courseStructureQueryOptions.programs.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function usePrograms(departmentId: number | null) {
  return useQuery({
    ...courseStructureQueryOptions.programs.byDepartment(departmentId!),
    enabled: !!departmentId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useProgram(id: number | null) {
  return useQuery({
    ...courseStructureQueryOptions.programs.detail(id ?? 0),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateProgram() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.createProgram(),
    onSuccess: async (_, variables) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.programs.all }),
        // A Program anchored under the AcademicUnit tree (parentAcademicUnitId)
        // instead of a Department — e.g. SECONDARY_SCHOOL — has no departmentId.
        ...(variables.departmentId !== null
          ? [
              qc.invalidateQueries({
                queryKey: courseStructureKeys.departments.detail(
                  variables.departmentId
                ),
              }),
            ]
          : []),
      ])
    },
  })
}

export function useUpdateProgram() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.updateProgram(),
    onSuccess: async (
      _,
      variables: { id: number; payload: UpdateProgramPayload }
    ) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: courseStructureKeys.programs.all }),
        qc.invalidateQueries({
          queryKey: courseStructureKeys.programs.detail(variables.id),
        }),
        // A reassignment (departmentId/parentAcademicUnitId change) can leave
        // a stale copy of this program embedded in a Department's or
        // Faculty's nested `programs` list — the *old* department/faculty in
        // particular, whose id isn't in `variables` to invalidate precisely.
        // Invalidating the whole departments/faculties trees (not just
        // `.detail(id)`) catches both the old and new home reliably; a plain
        // field edit re-invalidates the same trees too, which is harmless.
        qc.invalidateQueries({ queryKey: courseStructureKeys.departments.all }),
        qc.invalidateQueries({ queryKey: courseStructureKeys.faculties.all }),
      ])
    },
  })
}

export function useDeactivateProgram() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.deactivateProgram(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseStructureKeys.programs.all })
    },
  })
}

// ── Levels (university-wide, no update/delete — see academic_README.md) ──

export function useLevels() {
  return useQuery({
    ...courseStructureQueryOptions.levels.list(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateLevel() {
  const qc = useQueryClient()
  return useMutation({
    ...courseStructureMutationOptions.createLevel(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: courseStructureKeys.levels.all })
    },
  })
}
