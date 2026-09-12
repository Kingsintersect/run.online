"use client"

import StatusBadge from "@/components/custom/StatusBadge"
import type { NotificationChannel } from "../../types"

const CHANNEL_CONFIG: Record<
  NotificationChannel,
  { label: string; variant: "info" | "success" | "purple" | "orange" }
> = {
  EMAIL: { label: "Email", variant: "info" },
  SMS: { label: "SMS", variant: "orange" },
  IN_APP: { label: "In-App", variant: "purple" },
  PUSH: { label: "Push", variant: "success" },
}

export function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  const cfg = CHANNEL_CONFIG[channel]
  return <StatusBadge label={cfg.label} variant={cfg.variant} dot />
}
