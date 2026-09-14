"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { usersApi, usersKeys } from "@/services/usersApi"
import { moodleSyncService } from "../services/moodle-sync.service"
import { moodleSyncKeys } from "./query-keys"
import type {
  UserSyncQueryFilters,
  UserSyncResponse,
  PortalRole,
} from "../types"
import type { User } from "@/types/users"

// `GET /users` caps `limit` at 100 (confirmed live: it 400s above that), so a
// single request can't be used as a full lookup table — page through until
// every portal user has been fetched.
const USERS_PAGE_SIZE = 100

async function fetchAllPortalUsers(): Promise<User[]> {
  const first = await usersApi.listUsers({ limit: USERS_PAGE_SIZE, page: 1 })
  const pageCount = Math.ceil(first.total / USERS_PAGE_SIZE)
  if (pageCount <= 1) return first.data

  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) =>
      usersApi.listUsers({ limit: USERS_PAGE_SIZE, page: i + 2 })
    )
  )
  return [first, ...rest].flatMap((page) => page.data)
}

// `name`/`email`/`portalRole` on `UserSyncResponse` are a frontend-proposed
// addition (see "Frontend Contract Additions" in moodle_sync_UI_README.md) —
// unlike the endpoints in MISSING_BACKEND_APIS.md, the backend has not
// confirmed shipping these denormalized fields on the mapping record, and in
// practice they come back empty. `userId` (the portal user FK) is always
// present, so join client-side against the confirmed-live `GET /users` list
// to fill the display fields until the backend adds them natively.
function derivePortalRole(roles: string[] | undefined): PortalRole {
  // CORRECTION (2026-09-12): `roles` was typed as `{slug,name}[]` — the
  // comment above ("neither is reliably populated") was explaining away a
  // symptom of the real bug rather than the cause: GET /users actually
  // sends bare role-name strings (confirmed live), so `r.slug`/`r.name`
  // were always undefined and this always fell through to "STAFF". See
  // the matching correction on User.roles in @/types/users.
  const normalized = (roles ?? [])
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean)
  if (normalized.includes("STUDENT")) return "STUDENT"
  if (normalized.includes("TUTOR")) return "TUTOR"
  if (
    normalized.includes("ADMIN") ||
    normalized.includes("SUPER_ADMIN") ||
    normalized.includes("DIRECTOR")
  )
    return "ADMIN"
  return "STAFF"
}

function enrichWithPortalUser(
  row: UserSyncResponse,
  portalUser: User | undefined
): UserSyncResponse {
  if (!portalUser) return row
  const fullName = [portalUser.first_name, portalUser.last_name]
    .filter(Boolean)
    .join(" ")
  return {
    ...row,
    name: row.name || fullName || portalUser.username,
    email: row.email || portalUser.email,
    portalRole: row.portalRole || derivePortalRole(portalUser.roles),
  }
}

export function useSyncUsers(filters?: UserSyncQueryFilters) {
  const syncQuery = useQuery({
    queryKey: moodleSyncKeys.users(filters),
    queryFn: () => moodleSyncService.listUsers(filters),
    staleTime: 60 * 1000,
  })
  // Lookup table for client-side joining, not a paginated view — fetches
  // every portal user (across pages, see fetchAllPortalUsers) once and keeps
  // it cached under its own key.
  const usersQuery = useQuery({
    queryKey: [...usersKeys.all, "all-for-moodle-sync-join"] as const,
    queryFn: fetchAllPortalUsers,
    staleTime: 5 * 60 * 1000,
  })

  const data = useMemo(() => {
    if (!syncQuery.data) return undefined
    const byId = new Map(usersQuery.data?.map((u) => [u.id, u]) ?? [])
    return syncQuery.data.map((row) =>
      enrichWithPortalUser(row, byId.get(row.userId))
    )
  }, [syncQuery.data, usersQuery.data])

  return { ...syncQuery, data }
}

export function useSyncUserMapping(id: number) {
  return useQuery({
    queryKey: moodleSyncKeys.user(id),
    queryFn: () => moodleSyncService.getUserMapping(id),
    enabled: !!id,
  })
}

// Standing list of Moodle accounts with no matching portal user — the
// read-only equivalent of the `unmatched[]` a pull returns, so the admin
// can review them any time without re-running a pull. Degrades to an empty
// list on error.
export function useUnmatchedMoodleUsers(enabled = true) {
  return useQuery({
    queryKey: moodleSyncKeys.unmatchedUsers(),
    queryFn: () => moodleSyncService.getUnmatchedUsers(),
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  })
}
