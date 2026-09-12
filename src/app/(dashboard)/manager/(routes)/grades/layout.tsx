"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GraduationCap,
  TableProperties,
  BarChart2,
  Send,
  Settings2,
} from "lucide-react"

export default function GradesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // Gets "admin" or "manager"
  const baseRoute = pathname.split("/")[1]
  const TABS = [
    {
      label: "Results",
      href: `/${baseRoute}/grades/results`,
      Icon: TableProperties,
    },
    { label: "Summary", href: `/${baseRoute}/grades/summary`, Icon: BarChart2 },
    {
      label: "Publish Results",
      href: `/${baseRoute}/grades/publish-results`,
      Icon: Send,
    },
    {
      label: "Grading Schemes",
      href: `/${baseRoute}/grades/grading-schemes`,
      Icon: Settings2,
    },
  ]

  return (
    <div className="flex min-h-full flex-col">
      {/* Page header */}
      <div className="mx-4 mt-4 mb-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-foreground">
              Grade Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Results &amp; Analytics
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-4 px-4">
        <nav className="flex w-fit gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {TABS.map(({ label, href, Icon }) => {
            const active = pathname === href || pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
                  active
                    ? "border border-border bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                } `}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 px-4 pb-6">{children}</div>
    </div>
  )
}
