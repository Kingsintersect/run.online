"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, CheckCheck, Loader2, RefreshCw, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "../hooks/use-notifications"
import { useMarkAllRead } from "../hooks/use-notification-mutations"
import { NotificationItemCard } from "./NotificationItem"
import { NotificationFilters } from "./NotificationFilters"
import { NotificationDetailModal } from "./NotificationDetailModal"
import type {
  NotificationChannel,
  NotificationItem,
  NotificationStatus,
} from "../types"

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationList() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | NotificationStatus>(
    "ALL"
  )
  const [channelFilter, setChannelFilter] = useState<
    NotificationChannel | "ALL"
  >("ALL")
  const [opened, setOpened] = useState<NotificationItem | null>(null)

  const filters = {
    ...(statusFilter !== "ALL" && { status: statusFilter }),
    ...(channelFilter !== "ALL" && { channel: channelFilter }),
  }

  const { data, isLoading, isError, refetch, isFetching } =
    useNotifications(filters)
  const markAllRead = useMarkAllRead()

  if (isLoading) {
    return (
      <div className="space-y-2 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Bell size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Failed to load notifications.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw size={14} className="mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const { data: notifications = [], meta } = data ?? {
    data: [],
    meta: { total: 0, page: 1, limit: 20, unreadCount: 0 },
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Notifications</h1>
          {meta.unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-semibold text-white tabular-nums">
              {meta.unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={isFetching}
            onClick={() => refetch()}
            aria-label="Refresh notifications"
          >
            {isFetching ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {meta.unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCheck size={13} />
              )}
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <NotificationFilters
        activeStatus={statusFilter}
        activeChannel={channelFilter}
        onStatusChange={setStatusFilter}
        onChannelChange={setChannelFilter}
      />

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <BellOff size={32} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === "SENT"
                ? "No unread notifications."
                : "No notifications found."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((notification, idx) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
              >
                <NotificationItemCard
                  notification={notification}
                  onOpen={setOpened}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <NotificationDetailModal
        notificationId={opened?.id ?? null}
        fallback={opened}
        onClose={() => setOpened(null)}
      />

      {/* Footer count */}
      {notifications.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {notifications.length} of {meta.total} notifications
        </p>
      )}
    </div>
  )
}
