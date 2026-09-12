"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Sun,
  Moon,
  Menu,
  X,
  Check,
  CheckCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebarStore, useAppStore, useThemeStore } from "@/store"
import {
  useNotifications,
  useUnreadCount,
} from "@/modules/notifications/hooks/use-notifications"
import {
  useMarkRead,
  useMarkAllRead,
} from "@/modules/notifications/hooks/use-notification-mutations"
import type { NotificationChannel } from "@/modules/notifications/types"
import AnimatedLink from "../custom/AnimatedLink"

const channelIcon: Record<
  NotificationChannel,
  { bg: string; color: string; Icon: React.ElementType }
> = {
  IN_APP: { bg: "bg-blue-500/10", color: "text-blue-500", Icon: Bell },
  EMAIL: { bg: "bg-violet-500/10", color: "text-violet-500", Icon: Mail },
  SMS: {
    bg: "bg-emerald-500/10",
    color: "text-emerald-500",
    Icon: MessageSquare,
  },
  PUSH: { bg: "bg-orange-500/10", color: "text-orange-500", Icon: Smartphone },
}

function timeAgo(d: Date) {
  const s = (Date.now() - d.getTime()) / 1000
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function Header() {
  const { user } = useAppStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const { toggleMobile } = useSidebarStore()
  // Real data — GET /notifications (latest 8 for the dropdown) + GET
  // /notifications/unread-count (polled for the badge).
  const { data: notifData } = useNotifications({ limit: 8 })
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const notifications = notifData?.data ?? []
  const [showNotif, setShowNotif] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const unread =
    unreadData?.data.unreadCount ?? notifData?.meta.unreadCount ?? 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 backdrop-blur-sm lg:px-6">
      {/* Mobile menu */}
      <button
        onClick={toggleMobile}
        className="rounded-xl p-2 text-foreground transition-colors hover:bg-accent lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* <Logo
                href="/"
                showText={false}
                imageWidth={32}
                imageHeight={32}
                imageClassName="h-8 w-8 rounded-lg"
                className="items-center"
            /> */}

      {/* Search */}
      <div className="relative max-w-sm flex-1">
        <Search
          size={15}
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 transition-colors",
            searchFocused ? "text-primary" : "text-muted-foreground"
          )}
        />
        <input
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search courses, students…"
          className={cn(
            "w-full rounded-xl border border-transparent bg-muted py-2 pr-4 pl-9 text-sm transition-all duration-200 outline-none",
            "text-foreground placeholder:text-muted-foreground",
            searchFocused &&
              "border-primary bg-background shadow-sm ring-2 ring-primary/20"
          )}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <AnimatedLink href="/" variant="gradient-underline">
          Home
        </AnimatedLink>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif((p) => !p)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell size={17} />
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotif && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20"
                  onClick={() => setShowNotif(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Notifications
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {unread} unread
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {unread > 0 && (
                        <button
                          onClick={() => markAllRead.mutate()}
                          disabled={markAllRead.isPending}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                          title="Mark all read"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotif(false)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 divide-y divide-[--border] overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                        You&apos;re all caught up.
                      </p>
                    )}
                    {notifications.map((n, i) => {
                      const { bg, color, Icon } = channelIcon[n.channel]
                      const isUnread = n.readAt === null
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => isUnread && markRead.mutate(n.id)}
                          className={cn(
                            "flex gap-3 px-4 py-3 transition-colors hover:bg-accent",
                            isUnread
                              ? "cursor-pointer bg-primary/5"
                              : "cursor-default"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              bg,
                              color
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">
                              {n.subject}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {n.body}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {timeAgo(new Date(n.createdAt))}
                            </p>
                          </div>
                          {isUnread ? (
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : (
                            <Check
                              size={12}
                              className="mt-1 shrink-0 text-muted-foreground/40"
                            />
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User */}
        {user && (
          <div className="ml-1 flex items-center gap-2.5 border-l border-border pl-1.5">
            <div className="hidden text-right sm:block">
              <p className="text-xs leading-tight font-semibold text-foreground">
                {greeting()}, {user.name.split(" ")[0]}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {user.department ?? user.role.replace("_", " ")}
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-primary to-emerald-400 text-xs font-bold text-white ring-2 ring-background"
            >
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </motion.div>
          </div>
        )}
      </div>
    </header>
  )
}
