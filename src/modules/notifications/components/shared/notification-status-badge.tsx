"use client"

import StatusBadge from "@/components/custom/StatusBadge"
import type { NotificationStatus } from "../../types"

const STATUS_CONFIG: Record<
  NotificationStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "default" }
> = {
  SENT: { label: "Sent", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "destructive" },
  READ: { label: "Read", variant: "default" },
}

export function NotificationStatusBadge({
  status,
}: {
  status: NotificationStatus
}) {
  const cfg = STATUS_CONFIG[status]
  return <StatusBadge label={cfg.label} variant={cfg.variant} dot />
}
