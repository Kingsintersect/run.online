"use client"

import { useCallback, useMemo } from "react"
import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"
import { useUsers } from "./useUsersData"
import {
  deleteActionStateFor,
  isSuperAdminRoleName,
  type DeleteActionState,
  type DeleteActionTarget,
} from "../lib/account-deletion"

/**
 * Who may see the "Delete account" row action, and its state per row.
 *
 * DELETE /users/:id is gated on the literal `admin` role server-side (same
 * gate as creating users / assigning roles), not a permission — DEAN and
 * STAFF share the /manager screens and hold overlapping permissions, so a
 * permission check can't tell them apart. Role check instead, same precedent
 * and reasoning as Summary.tsx's isAdmin. SUPER_ADMIN passes the admin gate
 * and keeps total control per CLAUDE.md.
 *
 * Rows are never offered for the signed-in user's own account or for a
 * super_admin account. Student/tutor/staff rows don't carry roles, so the
 * super_admin ids come from the all-users list (shared, cached query; first
 * 100 users — super_admin accounts are few and created first). This is a UI
 * convenience, not enforcement.
 */
export function useAccountDeletion() {
  const user = useAppStore((s) => s.user)
  const canDelete =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  const usersQ = useUsers(undefined, { enabled: canDelete })

  const superAdminIds = useMemo(
    () =>
      new Set(
        (usersQ.data?.data ?? [])
          .filter((u) => u.roles.some(isSuperAdminRoleName))
          .map((u) => u.id)
      ),
    [usersQ.data]
  )
  const superAdminIdsKnown = usersQ.isSuccess
  const currentUserId = user?.id ?? null

  const stateFor = useCallback(
    (target: DeleteActionTarget): DeleteActionState =>
      canDelete
        ? deleteActionStateFor(target, {
            currentUserId,
            superAdminIds,
            superAdminIdsKnown,
          })
        : "hidden",
    [canDelete, currentUserId, superAdminIds, superAdminIdsKnown]
  )

  return { canDelete, stateFor }
}
