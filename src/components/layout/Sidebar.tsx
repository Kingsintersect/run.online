"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { logoutFromBackend } from "@/lib/auth/backendAuth"
import { motion, AnimatePresence } from "framer-motion"
import { gsap } from "gsap"
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navConfig, NavItem, NavGroup } from "@/config/nav.config"
import { useFeatureFlags } from "@/hooks/useFeatureFlags"
import { filterNavGroupsByFeatureFlags } from "@/lib/feature-flags/featureAccess"
import { useAppStore, useSidebarStore } from "@/store"
import Logo from "@/components/branding/Logo"
import { UNIVERSITY_NAME } from "@/config/global.config"
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog"

const roleMeta: Record<string, { label: string; cls: string }> = {
  STUDENT: {
    label: "Student",
    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  },
  TUTOR: {
    label: "Tutor",
    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  STAFF: {
    label: "Staff",
    cls: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  },
  GUEST: {
    label: "Guest",
    cls: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  },
  HOD: {
    label: "HOD",
    cls: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
  },
  DEAN: {
    label: "Dean",
    cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  BURSARY: {
    label: "Bursary",
    cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  },
  DIRECTOR: {
    label: "Director",
    cls: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  },
  ADMIN: {
    label: "Admin",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
}

function Badge({
  value,
  variant = "default",
}: {
  value?: string | number
  variant?: string
}) {
  if (value === undefined) return null
  const cls: Record<string, string> = {
    default: "bg-sidebar-primary/15 text-sidebar-primary",
    destructive: "bg-red-500/15 text-red-600",
    warning: "bg-amber-400/15 text-amber-700",
    success: "bg-emerald-500/15 text-emerald-700",
  }
  return (
    <span
      className={cn(
        "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
        cls[variant] ?? cls.default
      )}
    >
      {value}
    </span>
  )
}

function CollapseTooltip({
  label,
  badge,
  badgeVariant,
}: {
  label: string
  badge?: string | number
  badgeVariant?: string
}) {
  return (
    <div className="pointer-events-none absolute left-full z-50 ml-2.5 hidden items-center gap-2 rounded-xl border border-border bg-popover px-3 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-2xl group-hover:flex">
      <span className="font-medium">{label}</span>
      {badge !== undefined && <Badge value={badge} variant={badgeVariant} />}
    </div>
  )
}

function NavItem_({
  item,
  depth = 0,
  collapsed,
}: {
  item: NavItem
  depth?: number
  collapsed: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  // const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + "/") : false;
  const isActive = item.href
    ? item.matchExactOnly
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/")
    : false
  const hasChildren = !!item.children?.length
  const defaultOpen = hasChildren
    ? item.children!.some(
        (c) =>
          c.href === pathname || c.children?.some((cc) => cc.href === pathname)
      )
    : false
  const [open, setOpen] = useState(defaultOpen)
  const Icon = item.icon
  const pl = collapsed ? 0 : 12 + depth * 14

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => !collapsed && setOpen((p) => !p)}
          title={collapsed ? item.title : undefined}
          style={{ paddingLeft: `${pl}px` }}
          className={cn(
            "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            open && !collapsed && "bg-sidebar-accent/60",
            collapsed && "justify-center px-2!"
          )}
        >
          <Icon
            size={17}
            className={cn("shrink-0", isActive && "text-sidebar-primary")}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="flex-1 overflow-hidden text-left whitespace-nowrap"
              >
                {item.title}
              </motion.span>
            )}
          </AnimatePresence>
          {!collapsed && (
            <>
              <Badge value={item.badge} variant={item.badgeVariant} />
              <ChevronRight
                size={13}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-90"
                )}
              />
            </>
          )}
          {collapsed && (
            <CollapseTooltip
              label={item.title}
              badge={item.badge}
              badgeVariant={item.badgeVariant}
            />
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-0.5 ml-3 space-y-0.5 border-l border-sidebar-border pl-2.5">
                {item.children!.map((child) => (
                  <NavItem_
                    key={child.title}
                    item={child}
                    depth={depth + 1}
                    collapsed={false}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Hover-only prefetch: `prefetch={false}` stops Next from prefetching every
  // one of the ~20 sidebar routes the moment they hit the viewport (that alone
  // was dozens of RSC requests per page load); the mouse-enter / focus handlers
  // then warm just the route the user is actually about to visit, ~100ms
  // before the click, so navigation still feels instant.
  const warmRoute = () => {
    if (item.href) router.prefetch(item.href)
  }

  return (
    <Link
      href={item.href ?? "#"}
      prefetch={false}
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      title={collapsed ? item.title : undefined}
      style={{ paddingLeft: `${pl}px` }}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2!"
      )}
    >
      <Icon size={17} className="shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-hidden whitespace-nowrap"
          >
            {item.title}
          </motion.span>
        )}
      </AnimatePresence>
      {!collapsed && <Badge value={item.badge} variant={item.badgeVariant} />}
      {isActive && collapsed && (
        <span className="absolute top-1.5 right-1 h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground opacity-80" />
      )}
      {collapsed && (
        <CollapseTooltip
          label={item.title}
          badge={item.badge}
          badgeVariant={item.badgeVariant}
        />
      )}
    </Link>
  )
}

function Group({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  return (
    <div className="space-y-0.5">
      {group.label && !collapsed && (
        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {group.label}
        </p>
      )}
      {group.label && collapsed && (
        <div className="mx-2 my-2 border-t border-sidebar-border" />
      )}
      {group.items.map((item) => (
        <NavItem_ key={item.title} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

export default function Sidebar() {
  const { user } = useAppStore()
  const { collapsed, toggle } = useSidebarStore()
  const { data: featureFlagsResponse } = useFeatureFlags("default")
  const logoRef = useRef<HTMLDivElement>(null)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)

  const handleLogout = async () => {
    await logoutFromBackend()
    await signOut({ callbackUrl: "/auth/signin" })
  }

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { scale: 0.6, opacity: 0, rotate: -20 },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 0.5,
          ease: "back.out(1.7)",
          delay: 0.1,
        }
      )
    }
  }, [])

  const groups = user
    ? navConfig[user.role as keyof typeof navConfig]
    : undefined
  const visibleGroups = useMemo(
    () =>
      filterNavGroupsByFeatureFlags(groups ?? [], featureFlagsResponse?.flags),
    [groups, featureFlagsResponse?.flags]
  )

  if (!user) return null

  // Falls back instead of crashing if a role is ever missing from roleMeta
  // above — this already happened once (STAFF was addable to a route guard
  // elsewhere without anyone remembering this map too).
  const meta = roleMeta[user.role] ?? {
    label: user.role,
    cls: "bg-muted text-muted-foreground",
  }
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 264 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar will-change-[width]"
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4",
          collapsed && "justify-center px-2"
        )}
      >
        <div ref={logoRef}>
          <Logo
            href="/"
            showText={false}
            imageWidth={32}
            imageHeight={32}
            imageClassName="h-8 w-8 rounded-lg"
          />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-sm leading-tight font-bold whitespace-nowrap text-sidebar-foreground">
                {UNIVERSITY_NAME}
              </p>
              <p className="text-[10px] whitespace-nowrap text-muted-foreground">
                Portal Workspace
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav scroll area */}
      <div className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-2 py-2">
        {visibleGroups.map((group, i) => (
          <Group key={i} group={group} collapsed={collapsed} />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2 py-2",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sidebar-primary to-emerald-400 text-xs font-bold text-white">
            {initials}
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="min-w-0 flex-1 overflow-hidden"
              >
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user.name}
                </p>
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium",
                    meta.cls
                  )}
                >
                  {meta.label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={() => setLogoutDialogOpen(true)}
              className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
        <button
          onClick={toggle}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={15} />
          ) : (
            <>
              <PanelLeftClose size={15} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
      />
    </motion.aside>
  )
}
