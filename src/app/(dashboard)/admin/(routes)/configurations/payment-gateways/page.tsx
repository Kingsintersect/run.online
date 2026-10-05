import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PaymentGatewaysShell } from "@/modules/payment-gateways/components/payment-gateways-shell"

// Super admin only. The admin layout also lets BURSARY in, so the page guards
// by role. SUPER_ADMIN is the only role holding payment-gateways.view /
// .manage (created 2026-09-29), which the backend enforces on every route
// (bruno/payment-routing).
export default function PaymentGatewaysPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <PaymentGatewaysShell />
    </RoleGuard>
  )
}
