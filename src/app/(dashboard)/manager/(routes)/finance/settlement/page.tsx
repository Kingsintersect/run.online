"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SettlementAccountsScreen } from "@/modules/settlement-accounts/components/settlement-accounts-screen"

// Guarded by role: ADMIN holds settlement-accounts.view / .manage and
// split-rules.manage (created 2026-09-29), and the manager layout also admits
// DEAN and STAFF, who must not see this. The backend enforces the
// permissions on every route (bruno/payment-routing).
export default function ManagerSettlementPage() {
  return (
    <RoleGuard role={[UserRole.ADMIN]}>
      <SettlementAccountsScreen />
    </RoleGuard>
  )
}
