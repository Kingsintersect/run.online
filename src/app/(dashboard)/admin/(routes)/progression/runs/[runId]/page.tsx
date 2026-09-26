import RoleGuard from "@/components/dashboard/RoleGuard"
import { UserRole } from "@/config/nav.config"
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
    <RoleGuard role={[UserRole.SUPER_ADMIN]}>
      <RunWorkspace
        runId={Number(runId) || 0}
        historyHref="/admin/progression/runs"
      />
    </RoleGuard>
  )
}
