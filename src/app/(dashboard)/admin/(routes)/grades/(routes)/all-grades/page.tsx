import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { AllGradesShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

// Legacy flat list of grade rows, read-only (export + transcripts).
export default function AllGradesPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <AllGradesShell />
    </RoleGuard>
  )
}
