"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SettlementAccountsScreen } from "@/modules/settlement-accounts/components/settlement-accounts-screen"

// Guarded by role: SUPER_ADMIN and BURSARY are exactly the roles that hold
// settlement-accounts.view / .manage and split-rules.manage (created
// 2026-09-29). The backend enforces those permissions on every route
// (bruno/payment-routing), so a permission check here would add nothing.
export default function AdminSettlementPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.BURSARY]}>
      <SettlementAccountsScreen />
    </RoleGuard>
  )
}
