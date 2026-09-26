import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { ResultsWorkspaceShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

// Course results workspace (screen A). What the user can do inside is
// decided by their results.* permissions.
export default function CourseResultsPage() {
  return (
    <RoleGuard role={[UserRole.SUPER_ADMIN]} permissions={["results.view"]}>
      <ResultsWorkspaceShell
        sheetBasePath="/admin/grades/results"
        majorProgramFirst
      />
    </RoleGuard>
  )
}
