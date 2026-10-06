"use client"

import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PaymentLedgerAccessGate } from "@/modules/fee-management/components/admin/payment-ledger/payment-ledger-access-gate"
import { PaymentsLedgerScreen } from "@/modules/fee-management/components/admin/payment-ledger/payments-ledger-screen"

// GET /fees/payments (bruno/fee/Payments - List.bru). ADMIN is admitted by
// role; DEAN and STAFF share this layout and get in only when their session
// holds financial-transactions.view.
export default function ManagerPaymentsPage() {
  return (
    <RoleGuard role={[UserRole.ADMIN, UserRole.DEAN, UserRole.STAFF]}>
      <PaymentLedgerAccessGate roleAccess={[UserRole.ADMIN]}>
        <div className="p-6">
          <PaymentsLedgerScreen />
        </div>
      </PaymentLedgerAccessGate>
    </RoleGuard>
  )
}
