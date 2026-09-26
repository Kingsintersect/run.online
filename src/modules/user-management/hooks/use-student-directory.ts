"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ApiClientError } from "@/lib/clients/apiClient"
import { usersApi, usersKeys } from "@/services/usersApi"
import type { Student, StudentQueryFilters } from "@/types/users"

export interface StudentDirectoryFilters {
  search: string
  page: number
  limit: number
  /** Required: the list never loads outside a chosen major program. */
  majorProgramId: number | null
  programId: number | null
}

export type StudentDirectoryResult =
  | {
      available: true
      data: Student[]
      total: number
      totalPages: number
    }
  | {
      available: false
      /** 403: this role can't list students yet. 404: route not built. */
      reason: "forbidden" | "missing"
    }

// Read-only, server-side searched and paginated student list for staff who
// can view standings but not manage students (HOD on /tutor/students). Calls
// the same GET /users/students as the admin list. Today that route is
// Admin/Staff only, so an HOD gets 403 and the hook resolves to
// `{available: false}` instead of throwing (CLAUDE.md §14). The day the
// backend opens it to HOD (scoped to their department), the list appears with
// no frontend change.
export function useStudentDirectory(filters: StudentDirectoryFilters) {
  const params: StudentQueryFilters = {
    search: filters.search.trim() || undefined,
    page: filters.page,
    limit: filters.limit,
    major_program_id: filters.majorProgramId ?? undefined,
    program_id: filters.programId ?? undefined,
  }
  return useQuery({
    // Own suffix: the result shape differs from useStudents(), so the cache
    // entries must not collide. Still under usersKeys.students.all, so any
    // students invalidation refreshes it too.
    queryKey: [...usersKeys.students.list(params), "directory"] as const,
    queryFn: async (): Promise<StudentDirectoryResult> => {
      try {
        const res = await usersApi.listStudents(params)
        return {
          available: true,
          data: res.data,
          total: res.total,
          totalPages: Math.max(1, Math.ceil(res.total / filters.limit)),
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 403)
          return { available: false, reason: "forbidden" }
        if (error instanceof ApiClientError && error.status === 404)
          return { available: false, reason: "missing" }
        throw error
      }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    retry: false,
    enabled: filters.majorProgramId != null,
  })
}
