"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PaymentLedgerAccessGate } from "@/modules/fee-management/components/admin/payment-ledger/payment-ledger-access-gate"
import { PaymentsLedgerScreen } from "@/modules/fee-management/components/admin/payment-ledger/payments-ledger-screen"

// GET /fees/payments (bruno/fee/Payments - List.bru). SUPER_ADMIN is admitted
// by role (and usePermissions bypasses it anyway); BURSARY must hold
// financial-transactions.view (or .manage), the endpoint's own rule. The
// admin layout additionally limits BURSARY to its nav hrefs.
export default function AdminPaymentsPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.BURSARY]}>
      <PaymentLedgerAccessGate roleAccess={[UserRole.SUPER_ADMIN]}>
        <div className="p-6">
          <PaymentsLedgerScreen />
        </div>
      </PaymentLedgerAccessGate>
    </RoleGuard>
  )
}
