"use client"

import StatusBadge from "@/components/custom/StatusBadge"
import type { SyncStatus } from "../../types"

const STATUS_VARIANT: Record<
  SyncStatus,
  "success" | "default" | "destructive" | "warning" | "orange"
> = {
  SYNCED: "success",
  PENDING: "default",
  FAILED: "destructive",
  STALE: "warning",
  REMOVED_IN_MOODLE: "orange",
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  SYNCED: "Synced",
  PENDING: "Pending",
  FAILED: "Failed",
  STALE: "Stale",
  REMOVED_IN_MOODLE: "Removed in Moodle",
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
