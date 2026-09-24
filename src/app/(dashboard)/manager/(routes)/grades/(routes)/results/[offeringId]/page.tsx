import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { ResultSheetShell } from "@/modules/student-grades/_components/shells/StudentGradesShell"

export default async function ResultSheetPage({
  params,
}: {
  params: Promise<{ offeringId: string }>
}) {
  const { offeringId } = await params
  return (
    <RoleGuard role={[UserRole.ADMIN]} permissions={["results.view"]}>
      <ResultSheetShell
        offeringId={Number(offeringId) || 0}
        backHref="/manager/grades/results"
      />
    </RoleGuard>
  )
}
