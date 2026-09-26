import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SessionCloseReadiness } from "@/modules/progression/components/session-close-readiness"

// SUPER_ADMIN is guarded by role only: it holds every permission (usePermissions
// passes all checks), while RoleGuard reads the raw session list.
export default function SessionClosePage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <SessionCloseReadiness />
    </RoleGuard>
  )
}
