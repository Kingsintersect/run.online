import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { AdjustmentApprovalsShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

export default function AdjustmentApprovalsPage() {
  return (
    <RoleGuard
      role={[UserRole.SUPER_ADMIN]}
      permissions={["results.adjust.approve"]}
    >
      <AdjustmentApprovalsShell />
    </RoleGuard>
  )
}
