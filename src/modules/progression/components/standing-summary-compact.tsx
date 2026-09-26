"use client"

import { GraduationCap } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import {
  useStudentOutstandingCourses,
  useStudentSessionStandings,
} from "../hooks/use-progression"
import { PROGRESSION_PERMISSIONS } from "../lib/permissions"
import { FinancialStatusBadge, OutcomeBadge } from "./outcome-badge"
import { LoadingBlock, QueryError } from "./standing-states"

interface StandingSummaryCompactProps {
  studentId: number
}

// Read-only, one-card version of the standing panel for tight spaces such as
// the invoice drawer (BURSARY's view of a student). Shows the newest
// standing and the outstanding-course count as returned. No actions.
export function StandingSummaryCompact({
  studentId,
}: StandingSummaryCompactProps) {
  return (
    <PermissionGate require={PROGRESSION_PERMISSIONS.standingsView}>
      <section aria-labelledby={`standing-summary-${studentId}`}>
        <h3
          id={`standing-summary-${studentId}`}
          className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          <GraduationCap size={14} aria-hidden />
          Academic standing
        </h3>
        <SummaryBody studentId={studentId} />
      </section>
    </PermissionGate>
  )
}

function SummaryBody({ studentId }: StandingSummaryCompactProps) {
  const standings = useStudentSessionStandings(studentId)
  const outstanding = useStudentOutstandingCourses(studentId)

  if (standings.isLoading) return <LoadingBlock rows={1} />
  if (standings.isError)
    return (
      <QueryError
        message="Couldn't load this student's academic standing."
        onRetry={() => standings.refetch()}
      />
    )
  if (!standings.data?.available)
    return (
      <NotAvailableNotice
        title="Academic standing isn't available yet"
        className="p-4"
      />
    )

  const latest = standings.data.data[0] ?? null
  if (!latest)
    return (
      <p className="text-xs text-muted-foreground">
        No session standings recorded for this student yet.
      </p>
    )

  const outstandingCount = outstanding.data?.available
    ? outstanding.data.data.length
    : null

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-xs dark:bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">
          {latest.academic_session.name} · {latest.level.name}
        </span>
        <OutcomeBadge outcome={latest.outcome} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <FinancialStatusBadge status={latest.financial_status} />
        {latest.cgpa !== null && <span>CGPA {latest.cgpa}</span>}
        {outstandingCount !== null && (
          <span>
            · {outstandingCount} outstanding course
            {outstandingCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {latest.debt_override && (
        <p className="text-sky-800 dark:text-sky-300">
          Registration allowed despite outstanding fees:{" "}
          {latest.debt_override.reason}
        </p>
      )}
    </div>
  )
}
