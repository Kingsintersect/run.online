import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SessionCloseReadiness } from "@/modules/progression/components/session-close-readiness"

export default function SessionClosePage() {
  return (
    <RoleGuard
      role={[UserRole.ADMIN]}
      permissions={[
        "progression.readiness.view",
        "progression.session.lock",
        "progression.run.create",
      ]}
    >
      <SessionCloseReadiness />
    </RoleGuard>
  )
}
