"use client"

import { usePathname } from "next/navigation"
import { UserRole, navConfig, type NavItem } from "@/config/nav.config"
import RoleGuard from "@/components/dashboard/RoleGuard"
import { useAppStore } from "@/store"
import { PermissionDeniedScreen } from "@/lib/permissions/PermissionDeniedScreen"

/**
 * BURSARY shares the /admin tree with SUPER_ADMIN (its dashboard home is
 * /admin/finance/fees), but must only reach its own finance area. Most admin
 * pages carry no guard of their own, so this layout is the one place that
 * isolates it: a BURSARY session may only render paths under one of its own
 * /admin nav hrefs (and their sub-pages, e.g. /admin/finance/fees/types/new).
 * Derived from navConfig so the allowlist follows the sidebar automatically.
 *
 * A role check rather than a permission check: BURSARY and SUPER_ADMIN both
 * hold the finance permissions, and nothing in the backend session ties a
 * permission to "may see the rest of /admin" — the route is shared by role.
 * UI isolation only; the backend still enforces each endpoint.
 */
function collectHrefs(items: NavItem[]): string[] {
  return items.flatMap((i) => [
    ...(i.href ? [i.href] : []),
    ...(i.children ? collectHrefs(i.children) : []),
  ])
}

const BURSARY_ADMIN_PREFIXES = Array.from(
  new Set(
    navConfig[UserRole.BURSARY]
      .flatMap((g) => collectHrefs(g.items))
      .filter((href) => href.startsWith("/admin/"))
  )
)

function isBursaryPath(pathname: string): boolean {
  return BURSARY_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user } = useAppStore()

  const bursaryOutOfScope =
    user?.role === UserRole.BURSARY && !isBursaryPath(pathname)

  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.BURSARY]}>
      {bursaryOutOfScope ? (
        <PermissionDeniedScreen message="You don't have permission to access this section." />
      ) : (
        children
      )}
    </RoleGuard>
  )
}
