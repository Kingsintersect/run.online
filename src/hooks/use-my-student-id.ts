"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { usersApi, usersKeys } from "@/services/usersApi"
import { useAppStore, useAppHydrated } from "@/store"
import { UserRole } from "@/config/nav.config"
import type { Student, UpdateStudentPayload } from "@/types/users"

// MISSING_BACKEND_APIS.md §1.1, now shipped by the backend team —
// `GET /users/students/me` resolves the current JWT's Student.id directly
// via `usersApi.getMyStudent()`, so every consumer (student-grades,
// document, hostel, clearance, enrollment) gets a real id. `studentId: null`
// can still occur transiently (loading) or for a genuinely non-student
// caller. Retry policy (no 4xx retries, 2 attempts) is the app-wide default
// set in Providers.tsx.
export function useMyStudentId(): {
  studentId: number | null
  programId: number | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const hydrated = useAppHydrated()
  const role = useAppStore((s) => s.user?.role)

  const query = useQuery({
    queryKey: usersKeys.students.me(),
    queryFn: () => usersApi.getMyStudent(),
    // Wait for the persisted session to rehydrate before firing — otherwise
    // this can fire before the API client has a valid Authorization header
    // wired in, 401, and (previously, with retries disabled) get stuck until
    // a manual page reload.
    enabled: hydrated && role === UserRole.STUDENT,
    staleTime: 1000 * 60 * 10,
  })

  return {
    studentId: query.data?.data.id ?? null,
    programId: query.data?.data.program_id ?? null,
    isLoading: hydrated && role === UserRole.STUDENT && query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}

// The logged-in student's full profile record. Shares its cache with
// `useMyStudentId` (same query key + queryFn), so mounting both — as the
// dashboard does — still costs a single `GET /users/students/me`. Use this
// when you need the resolved names (department/faculty/level/program), not
// just the id.
export function useMyStudent(): {
  student: Student | null
  isLoading: boolean
  isError: boolean
  refetch: () => void
} {
  const hydrated = useAppHydrated()
  const role = useAppStore((s) => s.user?.role)

  const query = useQuery({
    queryKey: usersKeys.students.me(),
    queryFn: () => usersApi.getMyStudent(),
    enabled: hydrated && role === UserRole.STUDENT,
    staleTime: 1000 * 60 * 10,
  })

  return {
    student: query.data?.data ?? null,
    isLoading: hydrated && role === UserRole.STUDENT && query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}

// Self-service update of the logged-in student's own record via
// `PATCH /users/students/:id` (Admin, Self). The UI only exposes the
// contact fields; level / mode / status stay registry-controlled.
export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      payload,
    }: {
      studentId: number
      payload: UpdateStudentPayload
    }) => usersApi.updateStudent(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersKeys.students.me() })
      toast.success("Profile updated")
    },
    onError: () => toast.error("Couldn't update your profile — try again"),
  })
}
