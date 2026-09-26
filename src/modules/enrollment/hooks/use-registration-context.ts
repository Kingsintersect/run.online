"use client"

// Live-or-fallback (CLAUDE.md §14): resolves to `{available: true, data}`
// from `GET /me/registration-context`, or `{available: false}` while that
// route doesn't exist on the backend yet. Components render the
// context-driven registration for the former and keep the existing
// offerings-based registration (with an honest notice) for the latter — the
// day the route ships, this starts returning data with no component change.

import { useQuery } from "@tanstack/react-query"
import { useMyActiveSession } from "@/hooks/use-my-active-session"
import { createApiQueryOptions } from "@/lib/clients/apiClient"
import { live } from "@/modules/student-grades/services/results.service"
import { enrollmentApi } from "../services/enrollment.service"
import { registrationKeys } from "./query-keys"

// The live route requires `semester_id` (400 without it). When the caller
// doesn't pass one, the student's current semester is used: the active
// semester of their major program's active session. `noSemester` is true
// when none is active, so the page can say so rather than guess.
export function useRegistrationContext(
  semesterId?: number,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const active = useMyActiveSession()
  const resolvedId = semesterId ?? active.currentSemester?.id
  const resolving = semesterId == null && active.isLoading
  const query = useQuery({
    ...createApiQueryOptions({
      queryKey: registrationKeys.context(resolvedId),
      queryFn: () =>
        live(() => enrollmentApi.getRegistrationContext(resolvedId)),
    }),
    enabled: enabled && resolvedId != null,
    staleTime: 60 * 1000,
    retry: false,
  })
  return {
    ...query,
    isLoading: resolving || query.isLoading,
    noSemester: !resolving && resolvedId == null,
  }
}
