"use client"

import { useQuery } from "@tanstack/react-query"
import { usersApi, usersKeys } from "@/services/usersApi"
import { useAppStore, useAppHydrated } from "@/store"
import { UserRole } from "@/config/nav.config"
import type { Tutor } from "@/types/users"

// MISSING_BACKEND_APIS.md §1.1b, now shipped by the backend team — mirrors
// useMyStudentId(): `GET /users/lecturers/me` resolves the current JWT's
// Lecturer.id directly via usersApi.getMyLecturer(), needed for "my assigned
// courses" and "my teaching schedule" lookups that take a lecturerId.
export function useMyLecturerId(): {
  lecturerId: number | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const hydrated = useAppHydrated()
  const role = useAppStore((s) => s.user?.role)

  const query = useQuery({
    queryKey: usersKeys.tutors.me(),
    queryFn: () => usersApi.getMyLecturer(),
    enabled: hydrated && role === UserRole.TUTOR,
    staleTime: 1000 * 60 * 10,
  })

  return {
    lecturerId: query.data?.data.id ?? null,
    isLoading: hydrated && role === UserRole.TUTOR && query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}

// Full lecturer record for the logged-in tutor. Shares the `usersKeys.tutors.me()`
// cache with `useMyLecturerId`, so both cost one `GET /users/lecturers/me`.
export function useMyLecturer(): {
  lecturer: Tutor | null
  isLoading: boolean
  isError: boolean
} {
  const hydrated = useAppHydrated()
  const role = useAppStore((s) => s.user?.role)

  const query = useQuery({
    queryKey: usersKeys.tutors.me(),
    queryFn: () => usersApi.getMyLecturer(),
    enabled: hydrated && role === UserRole.TUTOR,
    staleTime: 1000 * 60 * 10,
  })

  return {
    lecturer: query.data?.data ?? null,
    isLoading: hydrated && role === UserRole.TUTOR && query.isLoading,
    isError: query.isError,
  }
}
