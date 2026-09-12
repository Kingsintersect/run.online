"use client"

import Link from "next/link"
import { LogIn } from "lucide-react"
import { UserRole } from "@/config/nav.config"
import { useAppStore, useAppHydrated } from "@/store"
import { PermissionDeniedScreen } from "@/lib/permissions/PermissionDeniedScreen"
import type { Permission } from "@/types/roles"

/* ------------------------------------------------------------------ */
/*  Helper: check if the user holds a given permission string          */
/*  Format: "resource.action"  e.g. "results.upload", "fees.verify"   */
/* ------------------------------------------------------------------ */

function hasPermission(
  userPermissions: Permission[] | undefined,
  required: string
): boolean {
  if (!userPermissions) return false
  const [resource, ...rest] = required.split(".")
  const action = rest.join(".")
  return userPermissions.some(
    (p) => p.resource === resource && p.action === action
  )
}

function hasAnyPermission(
  userPermissions: Permission[] | undefined,
  required: string[]
): boolean {
  return required.some((r) => hasPermission(userPermissions, r))
}

function hasAllPermissions(
  userPermissions: Permission[] | undefined,
  required: string[]
): boolean {
  return required.every((r) => hasPermission(userPermissions, r))
}

/* ------------------------------------------------------------------ */
/*  RoleGuard component                                                */
/* ------------------------------------------------------------------ */

interface RoleGuardProps {
  /** Single role or array of allowed roles */
  role: UserRole | UserRole[]
  /**
   * Optional permission strings the user must hold.
   * Format: "resource.action"  e.g. ["results.upload", "fees.verify"]
   */
  permissions?: string[]
  /**
   * When `permissions` is provided, controls matching strategy:
   * - "any"  → user needs at least one of the listed permissions (default)
   * - "all"  → user needs every listed permission
   */
  match?: "any" | "all"
  /** Custom fallback rendered when access is denied (instead of redirecting) */
  fallback?: React.ReactNode
  children: React.ReactNode
}

export default function RoleGuard({
  role,
  permissions: requiredPermissions,
  match = "any",
  fallback,
  children,
}: RoleGuardProps) {
  const { user } = useAppStore()
  const hydrated = useAppHydrated()

  const allowedRoles = Array.isArray(role) ? role : [role]

  const roleOk = !!user && allowedRoles.includes(user.role)

  const permOk =
    !requiredPermissions || requiredPermissions.length === 0
      ? true
      : match === "all"
        ? hasAllPermissions(user?.permissions, requiredPermissions)
        : hasAnyPermission(user?.permissions, requiredPermissions)

  const granted = roleOk && permOk

  if (!hydrated) return null

  if (!user) {
    const roleLabel = allowedRoles.map((r) => r).join(" or ")

    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <LogIn className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Login Required
          </h2>
          <p className="text-sm text-muted-foreground">
            You need to be logged in as{" "}
            <span className="font-medium text-foreground">{roleLabel}</span> to
            access this page.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LogIn className="size-4" />
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!granted) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <PermissionDeniedScreen message="You don't have permission to access this section." />
    )
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ */
/*  useUserPermissions hook                                            */
/*  For inline permission checks inside components                     */
/* ------------------------------------------------------------------ */

export function useUserPermissions() {
  const { user } = useAppStore()
  const userPermissions = user?.permissions

  return {
    /** Check if user has a specific permission: "resource.action" */
    can: (perm: string) => hasPermission(userPermissions, perm),

    /** Check if user has at least one of the given permissions */
    canAny: (perms: string[]) => hasAnyPermission(userPermissions, perms),

    /** Check if user has all of the given permissions */
    canAll: (perms: string[]) => hasAllPermissions(userPermissions, perms),

    /** The user's current role */
    role: user?.role ?? null,

    /** Check if user has a specific role */
    hasRole: (r: UserRole) => user?.role === r,

    /** Check if user has any of the given roles */
    hasAnyRole: (roles: UserRole[]) => !!user && roles.includes(user.role),
  }
}
