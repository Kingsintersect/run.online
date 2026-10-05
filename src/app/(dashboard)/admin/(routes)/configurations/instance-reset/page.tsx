import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { InstanceResetShell } from "@/modules/instance-reset/components/instance-reset-shell"

// Super admin only. The admin layout also lets BURSARY in, so the page guards
// by role; the proposed /system/instance-reset routes are super_admin only
// and answer 403 FORBIDDEN for anyone else (sandbox/instance-reset).
export default function InstanceResetPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <InstanceResetShell />
    </RoleGuard>
  )
}
