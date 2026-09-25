"use client"

import { useAppStore } from "@/store"

// The signed-in user's backend `users.id` as a number (the session keeps it
// as a string, see lib/auth/backendAuth.ts), or null when there is no
// numeric id. Used only to hide actions the server would refuse anyway under
// separation of duties (a sheet's submitter / a batch's creator can't approve
// it). The server stays the authority: it answers 403 SEPARATION_OF_DUTIES.
export function useCurrentUserId(): number | null {
  const id = useAppStore((s) => s.user?.id)
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}
