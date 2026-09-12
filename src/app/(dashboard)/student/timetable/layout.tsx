"use client"

import React, { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AcademicCalendarBanner } from "@/modules/timetable/components/AcademicCalendarBanner"
import { CalendarDays, Clock, List } from "lucide-react"

const TAB_LINKS = [
  {
    href: "/student/timetable",
    label: "My Timetable",
    icon: CalendarDays,
    exact: true,
  },
  {
    href: "/student/timetable/calendar",
    label: "Calendar",
    icon: List,
    exact: false,
  },
  {
    href: "/student/timetable/upcoming",
    label: "Upcoming",
    icon: Clock,
    exact: false,
  },
]

export default function TimetableLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="mx-auto space-y-5 px-4 py-8">
      <AcademicCalendarBanner />

      <div className="rounded-2xl border border-border/70 bg-card/95 p-2 shadow-sm">
        {/* <div className="mb-2 flex items-center gap-2 px-2 pt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles size={13} className="text-primary" />
                    Timetable Views
                </div> */}
        <div className="flex flex-wrap items-center gap-2">
          {TAB_LINKS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10 font-medium text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
