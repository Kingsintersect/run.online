"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart2,
  ClipboardList,
  GraduationCap,
  ListChecks,
  Send,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  usePermissions,
  type PermissionCheck,
} from "@/lib/permissions/usePermissions"
import { RESULTS_PERMISSIONS as P } from "../../lib/results-permissions"

interface SectionTab {
  label: string
  segment: string
  Icon: LucideIcon
  /** Shown when the session holds any of these. */
  anyOf: PermissionCheck[]
}

const TABS: SectionTab[] = [
  {
    label: "Course results",
    segment: "results",
    Icon: ClipboardList,
    anyOf: [P.view],
  },
  {
    label: "Summary",
    segment: "summary",
    Icon: BarChart2,
    anyOf: [P.analyticsView],
  },
  {
    label: "Adjustment approvals",
    segment: "approvals",
    Icon: ShieldCheck,
    anyOf: [P.adjustApprove],
  },
  {
    label: "Publish results",
    segment: "publish-results",
    Icon: Send,
    anyOf: [P.publish],
  },
  {
    label: "All grades",
    segment: "all-grades",
    Icon: ListChecks,
    anyOf: [{ resource: "results", action: "view.all" }, P.view],
  },
  {
    label: "Result configuration",
    segment: "grading-schemes",
    Icon: Settings2,
    anyOf: [P.schemesManage, P.policiesManage],
  },
]

// Shared header + tab strip for /admin/grades/* and /manager/grades/*.
// Replaces two identical copies of the route layout; tabs mirror the sidebar
// and are filtered by the same results permissions. This header owns the
// page's <h1>; the screens under it use <h2>.
export function GradesSectionLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { canAny } = usePermissions()
  const base = `/${pathname.split("/")[1]}/grades`
  const tabs = TABS.filter((t) => canAny(...t.anyOf))

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-4 mt-4 mb-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-foreground">
              Grade Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Results from Moodle, normalization and publishing
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto px-4">
        <nav
          aria-label="Grade management sections"
          className="flex w-fit gap-1 rounded-xl border border-border bg-muted/50 p-1"
        >
          {tabs.map(({ label, segment, Icon }) => {
            const href = `${base}/${segment}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
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

      <div className="flex-1 px-4 pb-6">{children}</div>
    </div>
  )
}
