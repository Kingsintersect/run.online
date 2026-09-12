"use client"

import { useAppStore } from "@/store"
import { UserRole } from "@/config/nav.config"

// Matches your actual Permission object shape from types/roles
export interface PermissionCheck {
  resource: string
  action: string
}

export function usePermissions() {
  const user = useAppStore((s) => s.user)
  const role = useAppStore((s) => s.activeRole)
  const permissions = user?.permissions ?? []

  // Super admin always passes every check, regardless of what's in the
  // assigned permission list — new resources (like a freshly-built module)
  // never need a catalog update just to keep working for this role.
  const isSuperAdmin = role === UserRole.SUPER_ADMIN

  const can = ({ resource, action }: PermissionCheck): boolean =>
    isSuperAdmin ||
    permissions.some((p) => p.resource === resource && p.action === action)

  const canAll = (...checks: PermissionCheck[]): boolean =>
    isSuperAdmin || checks.every(can)

  const canAny = (...checks: PermissionCheck[]): boolean =>
    isSuperAdmin || checks.some(can)

  const canAccessModule = (module: string): boolean =>
    isSuperAdmin || permissions.some((p) => p.module === module)

  return { can, canAll, canAny, canAccessModule, role, permissions }
}
