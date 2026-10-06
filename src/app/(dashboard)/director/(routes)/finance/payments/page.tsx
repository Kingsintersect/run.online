"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PaymentLedgerAccessGate } from "@/modules/fee-management/components/admin/payment-ledger/payment-ledger-access-gate"
import { PaymentsLedgerScreen } from "@/modules/fee-management/components/admin/payment-ledger/payments-ledger-screen"

// GET /fees/payments (bruno/fee/Payments - List.bru). The director layout
// admits SUPER_ADMIN and DIRECTOR; DIRECTOR must hold
// financial-transactions.view (or .manage), the endpoint's own rule, and is
// confined to its major-program scope server-side.
export default function DirectorPaymentsPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN, UserRole.DIRECTOR]}>
      <PaymentLedgerAccessGate roleAccess={[UserRole.SUPER_ADMIN]}>
        <div className="p-6">
          <PaymentsLedgerScreen />
        </div>
      </PaymentLedgerAccessGate>
    </RoleGuard>
  )
}
