import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SemesterRollover } from "@/modules/progression/components/semester-rollover"

// SUPER_ADMIN is guarded by role only: it holds every permission (usePermissions
// passes all checks), while RoleGuard reads the raw session list.
export default function SemesterRolloverPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <SemesterRollover />
    </RoleGuard>
  )
}
