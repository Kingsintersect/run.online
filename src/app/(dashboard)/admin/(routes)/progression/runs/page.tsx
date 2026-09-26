import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { RunHistory } from "@/modules/progression/components/run-history"

// Promotion run history (session-promotion screen 5). SUPER_ADMIN has total
// control, so no extra permission is layered on here; actions inside are
// gated by PROGRESSION_PERMISSIONS (usePermissions passes SUPER_ADMIN).
export default function PromotionRunsPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <RunHistory runsBasePath="/admin/progression/runs" />
    </RoleGuard>
  )
}
