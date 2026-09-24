import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { PublishResultShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

export default function PublishResultsPage() {
  return (
    <RoleGuard role={[UserRole.ADMIN]} permissions={["results.publish"]}>
      <PublishResultShell />
    </RoleGuard>
  )
}
