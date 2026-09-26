import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PromotionPolicyScreen } from "@/modules/progression/components/promotion-policy-screen"

export default function ProgressionPolicyPage() {
  return (
    <RoleGuard
      role={[UserRole.ADMIN]}
      permissions={["progression.policy.view", "progression.policy.manage"]}
    >
      <PromotionPolicyScreen />
    </RoleGuard>
  )
}
