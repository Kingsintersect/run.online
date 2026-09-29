"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SettlementAccountsScreen } from "@/modules/settlement-accounts/components/settlement-accounts-screen"

// Role-based guard on purpose: the proposed `settlement-accounts.*` /
// `split-rules.*` permissions (sandbox/payment-routing) don't exist on the
// backend yet, so there is no permission to check. Swap to `permissions`
// once the backend returns them.
export default function AdminSettlementPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.BURSARY]}>
      <SettlementAccountsScreen />
    </RoleGuard>
  )
}
