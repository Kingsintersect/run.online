import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { progressionPermissionName } from "@/modules/progression/lib/permissions"
import { RunHistory } from "@/modules/progression/components/run-history"

// Promotion run history (session-promotion screen 5).
export default function PromotionRunsPage() {
  return (
    <RoleGuard
      role={[UserRole.ADMIN]}
      permissions={[progressionPermissionName("runView")]}
    >
      <RunHistory runsBasePath="/manager/progression/runs" />
    </RoleGuard>
  )
}
