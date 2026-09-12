import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"

/**
 * Non-hook permission check for the service layer — mirrors
 * `usePermissions().can()` (SUPER_ADMIN bypass + a flat `resource`/`action`
 * lookup against the session's granted permissions).
 *
 * Use this to skip a request the current user can't make anyway, e.g. an
 * admin-only list endpoint that a service fetches as a name-lookup fallback:
 * calling it for a student just earns a 403.
 */
export function can(resource: string, action: string): boolean {
  const { user, activeRole } = useAppStore.getState()
  if (activeRole === UserRole.SUPER_ADMIN) return true
  return (user?.permissions ?? []).some(
    (p) => p.resource === resource && p.action === action
  )
}

/** True if the user has any of the given `resource.action` pairs. */
export function canAny(pairs: [resource: string, action: string][]): boolean {
  return pairs.some(([r, a]) => can(r, a))
}
