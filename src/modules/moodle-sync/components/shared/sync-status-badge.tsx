"use client"

import StatusBadge from "@/components/custom/StatusBadge"
import type { SyncStatus } from "../../types"

const STATUS_VARIANT: Record<
  SyncStatus,
  "success" | "default" | "destructive" | "warning"
> = {
  SYNCED: "success",
  PENDING: "default",
  FAILED: "destructive",
  STALE: "warning",
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  SYNCED: "Synced",
  PENDING: "Pending",
  FAILED: "Failed",
  STALE: "Stale",
}

interface SyncStatusBadgeProps {
  status: SyncStatus
  className?: string
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  return (
    <StatusBadge
      label={STATUS_LABEL[status]}
      variant={STATUS_VARIANT[status]}
      dot
      className={className}
    />
  )
}
