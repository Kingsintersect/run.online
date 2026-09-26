"use client"

// Live-or-fallback (CLAUDE.md §14): resolves to `{available: true, data}`
// from `GET /me/registration-context`, or `{available: false}` while that
// route doesn't exist on the backend yet. Components render the
// context-driven registration for the former and keep the existing
// offerings-based registration (with an honest notice) for the latter — the
// day the route ships, this starts returning data with no component change.

import { useQuery } from "@tanstack/react-query"
import { createApiQueryOptions } from "@/lib/clients/apiClient"
import { live } from "@/modules/student-grades/services/results.service"
import { enrollmentApi } from "../services/enrollment.service"
import { registrationKeys } from "./query-keys"

export function useRegistrationContext(
  semesterId?: number,
  { enabled = true }: { enabled?: boolean } = {}
) {
  return useQuery({
    ...createApiQueryOptions({
      queryKey: registrationKeys.context(semesterId),
      queryFn: () =>
        live(() => enrollmentApi.getRegistrationContext(semesterId)),
    }),
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  })
}
