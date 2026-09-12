"use client"

import { Mail, MessageSquare, Smartphone, Bell as BellIcon } from "lucide-react"
import Modal from "@/components/custom/Modal"
import StatusBadge from "@/components/custom/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { useNotification } from "../hooks/use-notifications"
import type { NotificationChannel, NotificationItem } from "../types"

const channelConfig: Record<
  NotificationChannel,
  { icon: React.ElementType; label: string }
> = {
  IN_APP: { icon: BellIcon, label: "In-App" },
  EMAIL: { icon: Mail, label: "Email" },
  SMS: { icon: MessageSquare, label: "SMS" },
  PUSH: { icon: Smartphone, label: "Push" },
}

const statusVariant: Record<
  string,
  "success" | "warning" | "destructive" | "info" | "default"
> = {
  SENT: "success",
  PENDING: "warning",
  FAILED: "destructive",
  READ: "info",
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface NotificationDetailModalProps {
  /** The notification id to show, or null when closed. */
  notificationId: number | null
  /** The already-loaded list row — shown instantly while the full record loads. */
  fallback?: NotificationItem | null
  onClose: () => void
}

export function NotificationDetailModal({
  notificationId,
  fallback,
  onClose,
}: NotificationDetailModalProps) {
  const { data, isLoading } = useNotification(notificationId)
  const n = data?.data ?? fallback ?? null

  const channel = n ? channelConfig[n.channel] : null
  const ChannelIcon = channel?.icon ?? BellIcon

  return (
    <Modal
      open={notificationId !== null}
      onClose={onClose}
      title={n?.subject ?? "Notification"}
      subtitle={n ? fmt(n.createdAt) : undefined}
      size="lg"
    >
      {!n ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {isLoading ? "Loading…" : "Notification not found."}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[11px] font-normal">
              <ChannelIcon size={11} />
              {channel?.label ?? n.channel}
            </Badge>
            <StatusBadge
              label={n.status}
              variant={statusVariant[n.status] ?? "default"}
              dot
            />
            {n.readAt === null && n.status === "SENT" && (
              <span className="text-[11px] font-medium text-blue-500">
                Unread
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {n.body}
          </p>

          <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-4 sm:grid-cols-2">
            <Meta label="Sent" value={fmt(n.createdAt)} />
            <Meta label="Read" value={fmt(n.readAt)} />
          </div>
        </div>
      )}
    </Modal>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
