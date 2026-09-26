"use client"

import type { ReactNode } from "react"
import { BookX, History } from "lucide-react"
import { PermissionGate } from "@/lib/permissions/PermissionGate"
import { NotAvailableNotice } from "@/modules/student-grades/_components/results/not-available-notice"
import {
  useStudentOutstandingCourses,
  useStudentSessionStandings,
} from "../hooks/use-progression"
import { PROGRESSION_PERMISSIONS } from "../lib/permissions"
import { OutstandingCoursesList } from "./outstanding-courses-list"
import { StandingDebtOverride } from "./standing-debt-override"
import { LoadingBlock, QueryError, SectionHeading } from "./standing-states"
import { StandingTimeline } from "./standing-timeline"

interface StudentStandingPanelProps {
  studentId: number
  /**
   * Hides the debt-override actions regardless of permission (BURSARY, DEAN
   * and HOD views get standings read-only).
   */
  readOnly?: boolean
}

// Screen 6 — a student's academic standing on the admin student profile:
// the standings timeline (newest first), debt-override actions on the
// current target standing, and the outstanding courses. Gated by
// standings.view; overrides by standings.debt_override unless `readOnly`.
export function StudentStandingPanel({
  studentId,
  readOnly = false,
}: StudentStandingPanelProps) {
  return (
    <PermissionGate require={PROGRESSION_PERMISSIONS.standingsView}>
      <div className="space-y-6">
        <StandingsSection studentId={studentId} readOnly={readOnly} />
        <OutstandingSection studentId={studentId} />
      </div>
    </PermissionGate>
  )
}

function StandingsSection({
  studentId,
  readOnly,
}: {
  studentId: number
  readOnly: boolean
}) {
  const query = useStudentSessionStandings(studentId)
  const headingId = `student-${studentId}-standings`

  let body: ReactNode
  if (query.isLoading) body = <LoadingBlock />
  else if (query.isError)
    body = (
      <QueryError
        message="Couldn't load this student's academic standing."
        onRetry={() => query.refetch()}
      />
    )
  else if (!query.data?.available)
    body = <NotAvailableNotice title="Academic standing isn't available yet" />
  else if (query.data.data.length === 0)
    body = (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        No session standings recorded for this student yet.
      </p>
    )
  else {
    const standings = query.data.data
    // The current target standing is the newest one still OPEN.
    const target = standings.find((s) => s.state === "OPEN") ?? null
    body = (
      <StandingTimeline
        standings={standings}
        renderActions={
          readOnly || !target
            ? undefined
            : (s) =>
                s.id === target.id ? (
                  <StandingDebtOverride standing={s} />
                ) : null
        }
      />
    )
  }

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading
        id={headingId}
        icon={<History size={15} className="text-primary" aria-hidden />}
      >
        Academic standing
      </SectionHeading>
      {body}
    </section>
  )
}

function OutstandingSection({ studentId }: { studentId: number }) {
  const query = useStudentOutstandingCourses(studentId)
  const headingId = `student-${studentId}-outstanding`

  let body: ReactNode
  if (query.isLoading) body = <LoadingBlock rows={1} />
  else if (query.isError)
    body = (
      <QueryError
        message="Couldn't load this student's outstanding courses."
        onRetry={() => query.refetch()}
      />
    )
  else if (!query.data?.available)
    body = (
      <NotAvailableNotice title="Outstanding courses aren't available yet" />
    )
  else
    body = (
      <OutstandingCoursesList
        courses={query.data.data}
        emptyMessage="This student has no outstanding courses."
      />
    )

  return (
    <section aria-labelledby={headingId}>
      <SectionHeading
        id={headingId}
        icon={<BookX size={15} className="text-primary" aria-hidden />}
      >
        Outstanding courses
      </SectionHeading>
      {body}
    </section>
  )
}
