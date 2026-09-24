"use client"

import { useQuery } from "@tanstack/react-query"
import { usersApi, usersKeys } from "@/services/usersApi"
import { useAppStore, useAppHydrated } from "@/store"
import { UserRole } from "@/config/nav.config"
import type { Tutor } from "@/types/users"

// HOD and DEAN share the tutor routes and can hold a Lecturer record of their
// own (they teach too). A HOD/DEAN without one gets a 404 here, which simply
// resolves to lecturerId = null — hence retry: false.
const TEACHING_ROLES: (UserRole | undefined)[] = [
  UserRole.TUTOR,
  UserRole.HOD,
  UserRole.DEAN,
]
const isTeachingRole = (role: UserRole | undefined) =>
  TEACHING_ROLES.includes(role)

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
    enabled: hydrated && isTeachingRole(role),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  return {
    lecturerId: query.data?.data.id ?? null,
    isLoading: hydrated && isTeachingRole(role) && query.isLoading,
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
    enabled: hydrated && isTeachingRole(role),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  return {
    lecturer: query.data?.data ?? null,
    isLoading: hydrated && isTeachingRole(role) && query.isLoading,
    isError: query.isError,
  }
}
