import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { ResultConfigurationShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

// Result configuration: grading schemes, program overrides, result policies
// and the read-only legacy grade bands.
export default function ResultConfigurationPage() {
  return (
    <RoleGuard role={[UserRole.ADMIN]}>
      <ResultConfigurationShell />
    </RoleGuard>
  )
}
