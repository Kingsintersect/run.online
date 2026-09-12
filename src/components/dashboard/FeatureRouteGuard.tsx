"use client"

import { usePathname } from "next/navigation"
import { canAccessPath } from "@/lib/feature-flags/featureAccess"
import { useFeatureFlags } from "@/hooks/useFeatureFlags"
import { useAppStore } from "@/store"
import { PermissionDeniedScreen } from "@/lib/permissions/PermissionDeniedScreen"

export default function FeatureRouteGuard({
  children,
  instanceId = "default",
}: {
  children: React.ReactNode
  instanceId?: string
}) {
  const pathname = usePathname()
  const { user } = useAppStore()
  const { data, isLoading } = useFeatureFlags(instanceId)

  const allowed = canAccessPath(pathname, data?.flags)

  if (isLoading || !user) return <>{children}</>

  if (!allowed) {
    return (
      <PermissionDeniedScreen message="This feature isn't available for your account." />
    )
  }

  return <>{children}</>
}
