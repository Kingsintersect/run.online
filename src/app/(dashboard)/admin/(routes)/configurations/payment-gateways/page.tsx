import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PaymentGatewaysShell } from "@/modules/payment-gateways/components/payment-gateways-shell"

// Super admin only. The admin layout also lets BURSARY in, so the page guards
// by role. The proposed `payment-gateways.manage` permission
// (sandbox/payment-routing) doesn't exist on the backend yet; switch this to
// a permission check once it does.
export default function PaymentGatewaysPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <PaymentGatewaysShell />
    </RoleGuard>
  )
}
