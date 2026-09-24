import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { ResultSheetShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

export default async function TutorResultSheetPage({
  params,
}: {
  params: Promise<{ offeringId: string }>
}) {
  const { offeringId } = await params
  return (
    <RoleGuard
      role={[UserRole.TUTOR, UserRole.HOD, UserRole.DEAN]}
      permissions={["results.view"]}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="sr-only">Course result sheet</h1>
        <ResultSheetShell
          offeringId={Number(offeringId) || 0}
          backHref="/tutor/results"
        />
      </div>
    </RoleGuard>
  )
}
