"use client"

import { Mail, MessageSquare, Smartphone, Bell as BellIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useMarkRead } from "../hooks/use-notification-mutations"
import type { NotificationItem, NotificationChannel } from "../types"

// ── Channel config ────────────────────────────────────────────────────────────

const channelConfig: Record<
  NotificationChannel,
  { icon: React.ElementType; label: string; colour: string }
> = {
  IN_APP: { icon: BellIcon, label: "In-App", colour: "text-blue-500" },
  EMAIL: { icon: Mail, label: "Email", colour: "text-purple-500" },
  SMS: { icon: MessageSquare, label: "SMS", colour: "text-green-500" },
  PUSH: { icon: Smartphone, label: "Push", colour: "text-orange-500" },
}

function formatRelativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return "Just now"
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: NotificationItem
  onOpen?: (notification: NotificationItem) => void
}

export function NotificationItemCard({
  notification,
  onOpen,
}: NotificationItemProps) {
  const isUnread =
    notification.readAt === null && notification.status === "SENT"
  const {
    icon: ChannelIcon,
    label: channelLabel,
    colour,
  } = channelConfig[notification.channel]
  const markRead = useMarkRead()

  const handleClick = () => {
    if (isUnread) {
      markRead.mutate(notification.id)
    }
    onOpen?.(notification)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "group flex cursor-pointer gap-4 border-b border-border/60 px-5 py-4 transition-colors last:border-none",
        isUnread
          ? "bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20 dark:hover:bg-blue-950/30"
          : "hover:bg-muted/30"
      )}
    >
      {/* Channel icon */}
      <div className={cn("mt-0.5 shrink-0", colour)}>
        <ChannelIcon size={18} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "line-clamp-1 text-sm leading-snug",
              isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80"
            )}
          >
            {notification.subject}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {isUnread && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                aria-label="Unread"
              />
            )}
            <span className="text-[11px] whitespace-nowrap text-muted-foreground">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
        </div>

        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </p>

        <div className="mt-1.5">
          <Badge
            variant="outline"
            className="h-4 gap-1 px-1.5 text-[10px] font-normal"
          >
            <ChannelIcon size={9} />
            {channelLabel}
          </Badge>
        </div>
      </div>
    </div>
  )
}
