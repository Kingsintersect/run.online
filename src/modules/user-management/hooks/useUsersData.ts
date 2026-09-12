"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  usersApi,
  usersKeys,
  usersQueryOptions,
  usersMutationOptions,
} from "@/services/usersApi"
import type { ApiClientError } from "@/lib/clients/apiClient"
import type {
  UserQueryFilters,
  StudentQueryFilters,
  TutorOnboardingStep,
} from "@/types/users"
import { useUploadProgress } from "@/hooks/use-upload-progress"

/** Pull the most descriptive message out of an API error — the backend's
 *  own `message`, then any Laravel-style field validation errors, then a
 *  supplied fallback. */
function describeApiError(err: unknown, fallback: string): string {
  const e = err as ApiClientError
  const data = e?.data as
    | { message?: string; errors?: Record<string, string[]> }
    | undefined
  const fieldErrors = data?.errors
    ? Object.values(data.errors).flat().filter(Boolean)
    : []
  if (fieldErrors.length) return fieldErrors.join(" ")
  if (data?.message) return data.message
  if (e?.message) return e.message
  return fallback
}

/* ── Stats ── */

export function useUserStats() {
  return useQuery({
    ...usersQueryOptions.stats(),
    staleTime: 1000 * 60 * 5,
  })
}

/* ── Users ── */

export function useUsers(filters?: UserQueryFilters) {
  return useQuery({
    ...usersQueryOptions.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useUser(id: number) {
  return useQuery({
    ...usersQueryOptions.detail(id),
    enabled: id > 0,
  })
}

export function useSetUserActive() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.setActive(),
    onSuccess: async (_res, { isActive }) => {
      // usersKeys.all is a prefix of the students/tutors/staff list keys, so
      // this refreshes every user table.
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      toast.success(isActive ? "Account reactivated" : "Account deactivated")
    },
    onError: (err) =>
      toast.error(describeApiError(err, "Failed to update account status")),
  })
}

/* ── Students ── */

export function useStudents(filters?: StudentQueryFilters) {
  return useQuery({
    ...usersQueryOptions.students.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useStudent(id: number) {
  return useQuery({
    ...usersQueryOptions.students.detail(id),
    enabled: id > 0,
  })
}

// Exact lookup by matric number (e.g. "CSC/2025/001") — hits
// `GET /users/students/matric/:matricNumber` directly, so it finds a student
// even when they're not on the currently-loaded page of the list. Modelled
// as a mutation because it's a one-shot, user-triggered action whose result
// feeds component state (opening a detail modal), not a cached view.
export function useStudentLookupByMatric() {
  return useMutation({
    mutationFn: (matricNumber: string) =>
      usersApi.getStudentByMatric(matricNumber.trim()),
    onError: (err: ApiClientError, matricNumber) =>
      toast.error(
        err.status === 404
          ? `No student found with matric number "${matricNumber.trim()}"`
          : describeApiError(err, "Matric lookup failed")
      ),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.updateStudent(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.students.all })
      toast.success("Student updated")
    },
    onError: () => toast.error("Failed to update student"),
  })
}

/* ── Tutors ── */

export function useTutors(filters?: UserQueryFilters) {
  return useQuery({
    ...usersQueryOptions.tutors.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useTutor(id: number) {
  return useQuery({
    ...usersQueryOptions.tutors.detail(id),
    enabled: id > 0,
  })
}

export function useCreateTutor() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.createTutor(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.tutors.all })
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      toast.success("Tutor created successfully")
    },
    onError: () => toast.error("Failed to create tutor"),
  })
}

export function useUpdateTutor() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.updateTutor(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.tutors.all })
      toast.success("Tutor updated")
    },
    onError: () => toast.error("Failed to update tutor"),
  })
}

// Admin/HOD: re-send a tutor's onboarding email (regenerates their password).
export function useResendTutorInvite() {
  return useMutation({
    mutationFn: (lecturerId: number) => usersApi.resendTutorInvite(lecturerId),
    onSuccess: (res) => {
      if (res.emailSent) {
        toast.success(`Onboarding email re-sent to ${res.email}`)
      } else {
        toast.warning(
          res.emailError
            ? `Password reset, but email failed: ${res.emailError}`
            : "Password reset — email delivery is not configured yet."
        )
      }
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Couldn't resend the invite."
      ),
  })
}

// Tutor (self): mark one first-login checklist step complete.
export function useUpdateMyOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (step: TutorOnboardingStep) =>
      usersApi.updateMyOnboarding(step),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.tutors.me() }),
  })
}

/* ── Course Assignments ── */

export function useCourseOfferings() {
  return useQuery({
    ...usersQueryOptions.courseOfferings(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useTutorCourses(tutorId: number) {
  return useQuery({
    ...usersQueryOptions.tutors.courses(tutorId),
    enabled: tutorId > 0,
  })
}

export function useAssignCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.assignCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.tutors.all })
      toast.success("Course assigned successfully")
    },
    onError: (err) => toast.error(err?.message ?? "Failed to assign course"),
  })
}

export function useUnassignCourse() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.unassignCourse(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.tutors.all })
      toast.success("Course unassigned")
    },
    onError: () => toast.error("Failed to unassign course"),
  })
}

/**
 * Bulk-import tutors from a CSV, exposing live transfer progress alongside the
 * mutation (the file can be several MB, and the import runs long enough that a
 * bare spinner reads as a hang).
 */
export function useBulkImportTutors() {
  const qc = useQueryClient()
  const progress = useUploadProgress()
  const mutation = useMutation({
    ...usersMutationOptions.bulkImportTutors(progress.handleProgress),
    onMutate: () => progress.start(),
    onSuccess: async (res) => {
      progress.succeed()
      await qc.invalidateQueries({ queryKey: usersKeys.tutors.all })
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      const { succeeded, failed, total } = res.data
      if (failed === 0) {
        toast.success(
          `${succeeded} of ${total} tutor${total === 1 ? "" : "s"} imported`
        )
      } else {
        toast.warning(
          `${succeeded} imported, ${failed} failed — see the row details below`
        )
      }
    },
    onError: (err) => {
      progress.fail()
      toast.error(describeApiError(err, "Bulk import failed to run"))
    },
  })

  return { ...mutation, progress }
}

/* ── Staff ── */

export function useStaffList(filters?: UserQueryFilters) {
  return useQuery({
    ...usersQueryOptions.staff.list(filters),
    staleTime: 1000 * 60 * 2,
  })
}

export function useStaffMember(id: number) {
  return useQuery({
    ...usersQueryOptions.staff.detail(id),
    enabled: id > 0,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.createStaff(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.staff.all })
      await qc.invalidateQueries({ queryKey: usersKeys.all })
      toast.success("Staff member created successfully")
    },
    onError: () => toast.error("Failed to create staff member"),
  })
}

export function useUpdateStaff() {
  const qc = useQueryClient()
  return useMutation({
    ...usersMutationOptions.updateStaff(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: usersKeys.staff.all })
      toast.success("Staff member updated")
    },
    onError: () => toast.error("Failed to update staff member"),
  })
}

/* ── Eligible Roles (for staff creation) ── */

export function useStaffEligibleRoles() {
  return useQuery({
    ...usersQueryOptions.staffEligibleRoles(),
    staleTime: 1000 * 60 * 10,
  })
}
