import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { ResultsWorkspaceShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

// Shared by TUTOR, HOD and DEAN (HOD/DEAN can teach too). A tutor holds only
// results.view and sees their own offerings' raw Moodle marks; HOD/DEAN
// permissions add pulling, mapping, normalizing, submitting and approving.
export default function TutorResultsPage() {
  return (
    <RoleGuard
      role={[UserRole.TUTOR, UserRole.HOD, UserRole.DEAN]}
      permissions={["results.view"]}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="sr-only">Course results</h1>
        <ResultsWorkspaceShell sheetBasePath="/tutor/results" />
      </div>
    </RoleGuard>
  )
}
