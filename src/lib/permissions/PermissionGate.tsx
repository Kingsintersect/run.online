"use client"

import { usePermissions, type PermissionCheck } from "./usePermissions"
import { PermissionDeniedScreen } from "./PermissionDeniedScreen"
import { PermissionDeniedModal } from "./PermissionDeniedModal"

interface PermissionGateProps {
  require: PermissionCheck | PermissionCheck[] // ← objects, never strings
  mode?: "all" | "any"
  fallback?: React.ReactNode
  /**
   * How to react when access is denied:
   * - "inline" (default) — render `fallback` (or nothing) in place. Use for
   *   hiding individual buttons/sections without disrupting the page.
   * - "screen" — replace the page with a full-page "Access Restricted" screen
   *   that auto-redirects to the user's own dashboard after a few seconds. Use
   *   when this gate guards an entire page behind a view permission.
   * - "modal" — show a blocking "Access Restricted" popup. Use when this gate
   *   guards an entire page behind a manage/action permission.
   */
  denyBehavior?: "inline" | "screen" | "modal"
  children: React.ReactNode
}

export function PermissionGate({
  require,
  mode = "all",
  fallback = null,
  denyBehavior = "inline",
  children,
}: PermissionGateProps) {
  const { can } = usePermissions()
  const checks = Array.isArray(require) ? require : [require]
  const allowed = mode === "any" ? checks.some(can) : checks.every(can)

  if (allowed) return <>{children}</>

  if (denyBehavior === "screen") {
    return <PermissionDeniedScreen resource={checks[0]?.resource} />
  }
  if (denyBehavior === "modal") {
    return <PermissionDeniedModal resource={checks[0]?.resource} />
  }
  return <>{fallback}</>
}
