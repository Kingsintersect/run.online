"use client"

import { UserRole } from "@/config/nav.config"
import RoleGuard from "@/components/dashboard/RoleGuard"

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // STAFF's own dashboard home (roleDashboardPath[STAFF] in nav.config.ts)
  // points here, but STAFF was missing from this guard's allow-list — every
  // STAFF login redirected straight into an access-denied screen. Folded in
  // the same way DEAN already is for ADMIN's area.
  return (
    <RoleGuard role={[UserRole.ADMIN, UserRole.DEAN, UserRole.STAFF]}>
      {children}
    </RoleGuard>
  )
}
