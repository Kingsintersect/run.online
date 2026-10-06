"use client"

import { UserRole } from "@/config/nav.config"
import { usePermissions } from "@/lib/permissions/usePermissions"
import { PermissionDeniedScreen } from "@/lib/permissions/PermissionDeniedScreen"

interface PaymentLedgerAccessGateProps {
  /**
   * Roles the backend admits to GET /fees/payments by role alone ("admin/
   * staff" in bruno/fee/Payments - List.bru). Every other role reaching the
   * page must hold financial-transactions.view (or .manage).
   */
  roleAccess: UserRole[]
  children: React.ReactNode
}

/**
 * Mirrors the endpoint's own rule: a role-based admit OR the
 * financial-transactions.view permission. A role check here is deliberate:
 * the backend admits those roles by role, not by a permission the session
 * carries. UI only; the server still enforces access and scope.
 */
export function PaymentLedgerAccessGate({
  roleAccess,
  children,
}: PaymentLedgerAccessGateProps) {
  const { canAny, role } = usePermissions()
  // .manage is accepted too: it implies viewing, and the reference role map
  // (src/lib/utils/Roles.Permissions.assignment.json) lists BURSARY with
  // .manage only. If the server disagrees it answers 403, shown honestly.
  const allowed =
    (role !== null && roleAccess.includes(role)) ||
    canAny(
      { resource: "financial-transactions", action: "view" },
      { resource: "financial-transactions", action: "manage" }
    )

  if (!allowed)
    return <PermissionDeniedScreen resource="financial-transactions" />
  return <>{children}</>
}
