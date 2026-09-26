import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
import { progressionPermissionName } from "@/modules/progression/lib/permissions"
import { RunWorkspace } from "@/modules/progression/components/run-workspace"

// Promotion run workspace (session-promotion screen 4). Each action inside
// is gated by its own PROGRESSION_PERMISSIONS key.
export default async function PromotionRunPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  return (
    <RoleGuard
      role={[UserRole.ADMIN]}
      permissions={[progressionPermissionName("runView")]}
    >
      <RunWorkspace
        runId={Number(runId) || 0}
        historyHref="/manager/progression/runs"
      />
    </RoleGuard>
  )
}
