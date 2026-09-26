"use client"

import Link from "next/link"
import { ArrowRight, SquarePen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRegistrationContext } from "../hooks/use-registration-context"

// Dashboard nudge: shown only when the backend says the student's target
// standing is NOT_REGISTERED and the semester's registration is open. While
// the registration-context endpoint isn't live, this renders nothing.
export function RegistrationOpenBanner() {
  const { data } = useRegistrationContext()
  if (!data?.available) return null
  const { standing, semester } = data.data
  if (!semester.is_open || standing?.registration_status !== "NOT_REGISTERED")
    return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:bg-emerald-500/10"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <SquarePen size={16} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Course registration is open for {semester.name}
          </p>
          <p className="text-xs text-muted-foreground">
            You haven&apos;t registered for {standing.academic_session.name} yet
            {standing.level.name ? ` (${standing.level.name})` : ""}.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="gap-1.5">
        <Link href="/student/enrollment">
          Register now
          <ArrowRight size={14} aria-hidden />
        </Link>
      </Button>
    </div>
  )
}
