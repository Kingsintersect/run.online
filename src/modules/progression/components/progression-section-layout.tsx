"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarClock,
  SlidersHorizontal,
  History,
  TrendingUp,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  usePermissions,
  type PermissionCheck,
} from "@/lib/permissions/usePermissions"
import { PROGRESSION_PERMISSIONS as P } from "../lib/permissions"
import { dashboardBase } from "../lib/readiness-links"

interface SectionTab {
  label: string
  segment: string
  Icon: LucideIcon
  /** Shown when the session holds any of these. */
  anyOf: PermissionCheck[]
}

const TABS: SectionTab[] = [
  {
    label: "Policy",
    segment: "policy",
    Icon: SlidersHorizontal,
    anyOf: [P.policyView, P.policyManage],
  },
  {
    label: "Semester rollover",
    segment: "rollover",
    Icon: CalendarClock,
    anyOf: [P.readinessView, P.sessionLock],
  },
  {
    label: "Session close",
    segment: "session-close",
    Icon: CalendarCheck,
    anyOf: [P.readinessView, P.sessionLock, P.runCreate],
  },
  {
    label: "Promotion runs",
    segment: "runs",
    Icon: History,
    anyOf: [P.runView, P.runCreate, P.runCommit],
  },
]

// Shared header + tab strip for /admin/progression/* and
// /manager/progression/*. Tabs are filtered by the progression permissions
// (SUPER_ADMIN sees all). This header owns the page's <h1>; screens use <h2>.
export function ProgressionSectionLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const { canAny } = usePermissions()
  const base = `${dashboardBase(pathname)}/progression`
  const tabs = TABS.filter((t) => canAny(...t.anyOf))

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-4 mt-4 mb-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-foreground">
              Session Promotion
            </h1>
            <p className="text-xs text-muted-foreground">
              Progression policy, semester rollover, session close and promotion
              runs
            </p>
          </div>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="mb-4 overflow-x-auto px-4">
          <nav
            aria-label="Session promotion sections"
            className="flex w-fit gap-1 rounded-xl border border-border bg-muted/50 p-1"
          >
            {tabs.map(({ label, segment, Icon }) => {
              const href = `${base}/${segment}`
              const active =
                pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={segment}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                    active
                      ? "border border-border bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      <div className="flex-1 px-4 pb-6">{children}</div>
    </div>
  )
}
