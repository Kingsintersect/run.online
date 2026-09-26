import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { SemesterRollover } from "@/modules/progression/components/semester-rollover"

export default function SemesterRolloverPage() {
  return (
    <RoleGuard
      role={[UserRole.ADMIN]}
      permissions={["progression.readiness.view", "progression.session.lock"]}
    >
      <SemesterRollover />
    </RoleGuard>
  )
}
