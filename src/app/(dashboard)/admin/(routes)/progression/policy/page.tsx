import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PromotionPolicyScreen } from "@/modules/progression/components/promotion-policy-screen"

// SUPER_ADMIN is guarded by role only: it holds every permission (usePermissions
// passes all checks), while RoleGuard reads the raw session list.
export default function ProgressionPolicyPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <PromotionPolicyScreen />
    </RoleGuard>
  )
}
