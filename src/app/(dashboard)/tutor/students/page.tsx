import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { StudentStandingsDirectory } from "@/modules/user-management/components/student-standings-directory"

// Read-only academic standing lookup. The /tutor area is shared by TUTOR,
// HOD and DEAN; standings.view is the real gate (HOD holds it, tutors don't).
export default function TutorStudentsPage() {
  return (
    <RoleGuard
      role={[UserRole.TUTOR, UserRole.HOD, UserRole.DEAN]}
      permissions={["standings.view"]}
    >
      <StudentStandingsDirectory />
    </RoleGuard>
  )
}
